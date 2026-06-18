import { BadRequestException, Injectable } from '@nestjs/common';
import { SettlementRepository } from './settlement.repository';

/**
 * 원천징수 신고·납부 / 지급명세서 집계 서비스
 *
 * 플랫폼이 원천징수의무자이므로, 매월 신고·납부와 지급명세서 제출에 필요한
 * 집계를 제공한다. 원천징수는 지급 시점에 성립하므로 집계 기준은 신청월이
 * 아니라 실지급일(paid_at)이며, status = PAID 건만 집계한다.
 *
 * paid_at은 KST 벽시계 기준으로 적재되므로, 기간 경계는 Date.UTC로 구성해
 * timestamp 컬럼 값과 1:1로 일치시킨다.
 */
@Injectable()
export class WithholdingReportService {
  constructor(private readonly settlementRepository: SettlementRepository) {}

  /**
   * 월별 원천세 집계
   * 원천징수이행상황신고서[홈택스] + 지방소득세 특별징수[위택스] 입력값
   */
  async getMonthlyWithholdingReport(year: number, month: number) {
    if (month < 1 || month > 12) {
      throw new BadRequestException('month는 1~12 사이여야 합니다.');
    }

    const { start, end } = this.monthRange(year, month);
    const { sum, personnel } =
      await this.settlementRepository.aggregateWithholdingByPeriod(start, end);

    return {
      period: `${year}-${String(month).padStart(2, '0')}`,
      personnel, // 지급 인원(중복 스트리머 제거)
      totalTaxBase: sum.tax_base ?? 0, // 총지급액(원천징수 대상) → 신고서 '총지급액'
      totalIncomeTax: sum.income_tax_amount ?? 0, // 소득세 합계 → 홈택스 납부액(3%)
      totalLocalTax: sum.local_tax_amount ?? 0, // 지방소득세 합계 → 위택스 납부액
      totalPayout: sum.payout_amount ?? 0, // 실지급액 합계(내부 검증용)
    };
  }

  /**
   * 스트리머별 지급명세서
   * 간이지급명세서(month 지정) / 지급명세서(month 미지정 = 연간)
   */
  async getPaymentStatement(year: number, month?: number) {
    let start: Date;
    let end: Date;

    if (month === undefined) {
      ({ start, end } = this.yearRange(year));
    } else {
      if (month < 1 || month > 12) {
        throw new BadRequestException('month는 1~12 사이여야 합니다.');
      }
      ({ start, end } = this.monthRange(year, month));
    }

    const rows = await this.settlementRepository.groupWithholdingByStreamer(
      start,
      end,
    );

    return {
      period:
        month === undefined
          ? `${year}`
          : `${year}-${String(month).padStart(2, '0')}`,
      statements: rows.map((row) => ({
        streamerIdx: row.streamer_idx,
        totalTaxBase: row._sum.tax_base ?? 0,
        totalIncomeTax: row._sum.income_tax_amount ?? 0,
        totalLocalTax: row._sum.local_tax_amount ?? 0,
        totalPayout: row._sum.payout_amount ?? 0,
      })),
    };
  }

  /** 해당 연·월의 KST 벽시계 기준 [시작, 다음 달 시작) 범위 */
  private monthRange(year: number, month: number) {
    return {
      start: new Date(Date.UTC(year, month - 1, 1)),
      end: new Date(Date.UTC(year, month, 1)),
    };
  }

  /** 해당 연도의 KST 벽시계 기준 [1/1, 다음 해 1/1) 범위 */
  private yearRange(year: number) {
    return {
      start: new Date(Date.UTC(year, 0, 1)),
      end: new Date(Date.UTC(year + 1, 0, 1)),
    };
  }
}
