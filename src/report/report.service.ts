import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ReportResolveAction,
  ReportStatus,
  ReportTargetType,
  SanctionType,
} from '@prisma/client';
import { UserService } from 'src/user/user.service';
import { SanctionService } from 'src/sanction/sanction.service';
import { AdminLiveService } from 'src/live/admin-live.service';
import { AdminAuditLogService } from 'src/admin-audit-log/admin-audit-log.service';
import { ReportRepository } from './report.repository';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';

/** 동일 대상 누적 신고 에스컬레이션 임계치 */
const ESCALATION_THRESHOLD = 10;

/** 처리 액션 → 제재 유형 매핑 (자동 제재 기록) */
const ACTION_SANCTION_TYPE: Partial<Record<ReportResolveAction, SanctionType>> =
  {
    [ReportResolveAction.WARN]: SanctionType.WARNING,
    [ReportResolveAction.SUSPEND]: SanctionType.ACCOUNT_SUSPEND,
  };

@Injectable()
export class ReportService {
  constructor(
    private readonly repository: ReportRepository,
    private readonly userService: UserService,
    private readonly sanctionService: SanctionService,
    private readonly adminLiveService: AdminLiveService,
    private readonly auditLogService: AdminAuditLogService,
  ) {}

  /**
   * 신고 접수 (유저용)
   */
  async createReport(reporterIdx: number, dto: CreateReportDto) {
    if (reporterIdx === dto.reportedIdx) {
      throw new BadRequestException('본인을 신고할 수 없습니다.');
    }
    const reported = await this.userService.findByUserIdx(dto.reportedIdx);
    if (!reported) {
      throw new NotFoundException('신고 대상 유저를 찾을 수 없습니다.');
    }

    return await this.repository.create({
      reporter_idx: reporterIdx,
      reported_idx: dto.reportedIdx,
      target_type: dto.targetType,
      target_ref: dto.targetRef ?? null,
      reason: dto.reason,
      evidence: dto.evidence,
    });
  }

  /**
   * 신고 목록 (관리자) — 피신고자 누적 신고 수 + 에스컬레이션 플래그 포함
   */
  async findAll(options: {
    status?: ReportStatus;
    targetType?: ReportTargetType;
    reportedIdx?: number;
    limit: number;
    offset: number;
  }) {
    const { items, total } = await this.repository.findAll(options);
    const reportedIdxList = [
      ...new Set(
        items
          .map((report) => report.reported_idx)
          .filter((idx): idx is number => idx != null),
      ),
    ];
    const countMap = await this.repository.countByReportedIdx(reportedIdxList);

    return {
      items: items.map((report) => {
        const reportCount = report.reported_idx
          ? (countMap.get(report.reported_idx) ?? 0)
          : 0;
        return {
          ...report,
          report_count: reportCount,
          is_escalated: reportCount >= ESCALATION_THRESHOLD,
        };
      }),
      total,
    };
  }

  /**
   * 신고 상세 (관리자) — 피신고자 제재 이력 포함
   */
  async findDetail(id: number) {
    const report = await this.repository.findById(id);
    if (!report) {
      throw new NotFoundException('신고 내역을 찾을 수 없습니다.');
    }

    const sanctionHistory = report.reported_idx
      ? await this.sanctionService.findAll({
          userIdx: report.reported_idx,
          limit: 20,
          offset: 0,
        })
      : { items: [], total: 0 };

    return {
      ...report,
      reported_sanctions: sanctionHistory.items,
    };
  }

  /**
   * 신고 처리 (관리자).
   * 기각(DISMISS) 외 액션은 제재 시스템에 자동 기록되고,
   * END_BROADCAST는 해당 방송을 즉시 강제 종료한다.
   */
  async resolveReport(
    reportId: number,
    adminIdx: number,
    dto: ResolveReportDto,
  ) {
    const report = await this.repository.findById(reportId);
    if (!report) {
      throw new NotFoundException('신고 내역을 찾을 수 없습니다.');
    }
    if (
      report.status === ReportStatus.RESOLVED ||
      report.status === ReportStatus.DISMISSED
    ) {
      throw new BadRequestException('이미 처리된 신고입니다.');
    }
    if (!report.reported_idx && dto.action !== ReportResolveAction.DISMISS) {
      throw new BadRequestException(
        '피신고자가 탈퇴하여 제재를 적용할 수 없습니다. 기각 처리하세요.',
      );
    }

    // 1. 액션 실행 (기각 제외)
    const sanctionType = ACTION_SANCTION_TYPE[dto.action];
    if (sanctionType) {
      await this.sanctionService.createSanction(adminIdx, {
        userIdx: report.reported_idx,
        type: sanctionType,
        reason: `[신고 #${reportId} 처리] ${dto.reason}`,
      });
    }
    if (dto.action === ReportResolveAction.END_BROADCAST) {
      await this.adminLiveService.forceEndBroadcast(
        adminIdx,
        report.reported_idx,
        `[신고 #${reportId} 처리] ${dto.reason}`,
      );
    }

    // 2. 신고 상태 갱신 + 감사 로그
    const resolved = await this.repository.resolve(reportId, {
      status:
        dto.action === ReportResolveAction.DISMISS
          ? ReportStatus.DISMISSED
          : ReportStatus.RESOLVED,
      resolve_action: dto.action,
      resolve_reason: dto.reason,
      resolved_by: adminIdx,
    });

    await this.auditLogService.record({
      adminIdx,
      action: 'REPORT_RESOLVE',
      targetType: 'REPORT',
      targetId: reportId,
      reason: dto.reason,
      detail: {
        resolve_action: dto.action,
        reported_idx: report.reported_idx,
      },
    });

    return resolved;
  }
}
