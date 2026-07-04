import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SanctionStatus } from '@prisma/client';
import { AwsService } from 'src/aws/aws.service';
import { AdminAuditLogService } from 'src/admin-audit-log/admin-audit-log.service';
import {
  maskAddress,
  maskEmail,
  maskName,
  maskPhone,
} from 'src/common/utils/privacy-masking.util';
import { AccountDeletionService } from './account-deletion.service';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';
import {
  AdminUserRepository,
  AdminUserStatusFilter,
} from './admin-user.repository';
import { PrivacyField } from './dto/admin-privacy-view.dto';

@Injectable()
export class AdminUserService {
  constructor(
    private readonly adminUserRepository: AdminUserRepository,
    private readonly userRepository: UserRepository,
    private readonly userService: UserService,
    private readonly accountDeletionService: AccountDeletionService,
    private readonly auditLogService: AdminAuditLogService,
    private readonly awsService: AwsService,
  ) {}

  async findAll(options: {
    search?: string;
    provider?: string;
    identityVerified?: boolean;
    adultVerified?: boolean;
    isAdmin?: boolean;
    businessType?: string;
    status?: AdminUserStatusFilter;
    limit: number;
    offset: number;
  }) {
    const { items, total } = await this.adminUserRepository.findAll(options);
    return {
      items: items.map((user) => ({
        idx: user.idx,
        user_id: user.user_id,
        nickname: user.nickname,
        profile_img: user.profile_img,
        oauth_provider: user.oauth_provider,
        is_admin: user.is_admin,
        is_identity_verified: user.is_identity_verified,
        identity_verified_at: user.identity_verified_at,
        is_adult_verified: user.is_adult_verified,
        business_type: user.business_type,
        created_at: user.created_at,
        coin_balance: user.coinBalance?.coin_balance ?? 0,
        active_sanctions: user.sanctions,
      })),
      total,
    };
  }

  /**
   * 회원 상세 — 개인정보(UserDetail)는 마스킹해 반환.
   * 원문은 privacy-view API로만 열람 가능 (사유 필수 + 열람 로그).
   */
  async findDetail(userIdx: number) {
    const detail = await this.adminUserRepository.findDetail(userIdx);
    if (!detail) {
      throw new NotFoundException('회원을 찾을 수 없습니다.');
    }
    const { user, fanCount, followingCount, bookmarkedByCount } = detail;
    const { password, userDetail, ...rest } = user as any; // eslint-disable-line @typescript-eslint/no-unused-vars

    const now = new Date();
    return {
      ...rest,
      userDetail: userDetail
        ? {
            name: maskName(userDetail.name),
            sex: userDetail.sex,
            phone: maskPhone(userDetail.phone),
            email: maskEmail(userDetail.email),
            address: maskAddress(userDetail.address),
            created_at: userDetail.created_at,
          }
        : null,
      is_live: (user.streams && (user.streams as any).stream_id) != null,
      counts: {
        fans: fanCount,
        following: followingCount,
        bookmarked_by: bookmarkedByCount,
      },
      sanctions: user.sanctions.map((sanction) => ({
        ...sanction,
        is_active:
          sanction.status === SanctionStatus.ACTIVE &&
          (!sanction.expires_at || sanction.expires_at > now),
      })),
    };
  }

  /**
   * 개인정보 원문 열람 — 사유 필수, 열람 로그(PRIVACY_VIEW) 기록
   */
  async viewPrivacyField(
    adminIdx: number,
    userIdx: number,
    field: PrivacyField,
    reason: string,
  ) {
    const detail = await this.adminUserRepository.findDetail(userIdx);
    if (!detail) {
      throw new NotFoundException('회원을 찾을 수 없습니다.');
    }
    const userDetail = detail.user.userDetail;
    if (!userDetail) {
      throw new NotFoundException('등록된 개인정보가 없습니다.');
    }

    await this.auditLogService.record({
      adminIdx,
      action: 'PRIVACY_VIEW',
      targetType: 'USER',
      targetId: userIdx,
      reason,
      detail: { field },
    });

    return { field, value: userDetail[field] ?? null };
  }

  /**
   * 닉네임 강제 변경 (부적절 닉네임 대응)
   */
  async forceUpdateNickname(
    adminIdx: number,
    userIdx: number,
    nickname: string,
    reason: string,
  ) {
    const user = await this.userRepository.findByUserIdx(userIdx);
    if (!user) {
      throw new NotFoundException('회원을 찾을 수 없습니다.');
    }
    const result = await this.userService.updateNickname(userIdx, nickname);
    await this.auditLogService.record({
      adminIdx,
      action: 'USER_NICKNAME_FORCE_UPDATE',
      targetType: 'USER',
      targetId: userIdx,
      reason,
      detail: { before: user.nickname, after: nickname },
    });
    return result.user;
  }

  /**
   * 프로필 이미지 강제 삭제 (부적절 이미지 대응)
   */
  async forceDeleteProfileImage(
    adminIdx: number,
    userIdx: number,
    reason?: string,
  ) {
    const user = await this.userRepository.findByUserIdx(userIdx);
    if (!user) {
      throw new NotFoundException('회원을 찾을 수 없습니다.');
    }
    if (!user.profile_img) {
      throw new BadRequestException('프로필 이미지가 없습니다.');
    }

    await this.userRepository.updateProfileImage(userIdx, '');

    // S3 원본 정리 (best-effort)
    const key = user.profile_img.replace(`${process.env.CDN_URL}/`, '');
    if (key.startsWith('profile/')) {
      await this.awsService
        .deleteFromS3(key)
        .catch((e) => console.error(`프로필 이미지 S3 삭제 실패: ${e}`));
    }

    await this.auditLogService.record({
      adminIdx,
      action: 'USER_PROFILE_IMAGE_DELETE',
      targetType: 'USER',
      targetId: userIdx,
      reason,
      detail: { deleted_url: user.profile_img },
    });
  }

  /**
   * 관리자 권한 부여/회수
   */
  async toggleAdminRole(
    adminIdx: number,
    userIdx: number,
    isAdmin: boolean,
    reason: string,
  ) {
    if (adminIdx === userIdx && !isAdmin) {
      throw new BadRequestException('본인의 관리자 권한은 회수할 수 없습니다.');
    }
    const user = await this.userRepository.findByUserIdx(userIdx);
    if (!user) {
      throw new NotFoundException('회원을 찾을 수 없습니다.');
    }
    const updated = await this.adminUserRepository.updateIsAdmin(
      userIdx,
      isAdmin,
    );
    await this.auditLogService.record({
      adminIdx,
      action: isAdmin ? 'USER_ADMIN_GRANT' : 'USER_ADMIN_REVOKE',
      targetType: 'USER',
      targetId: userIdx,
      reason,
    });
    return { idx: updated.idx, is_admin: updated.is_admin };
  }

  /**
   * 강제 탈퇴 — 본인 재확인 없이 탈퇴 플로우 실행 (NCP 채널 정리 포함).
   * 잔여 코인/미정산 수익 등 차단 조건은 유저 탈퇴와 동일하게 적용된다.
   */
  async forceDeleteUser(adminIdx: number, userIdx: number, reason: string) {
    await this.accountDeletionService.forceDeleteAccount(userIdx);
    await this.auditLogService.record({
      adminIdx,
      action: 'USER_FORCE_DELETE',
      targetType: 'USER',
      targetId: userIdx,
      reason,
    });
  }
}
