import { Injectable } from '@nestjs/common';
import {
  InquiryStatus,
  PaymentTransactionStatus,
  ReportStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

/** KST 기준 오늘 0시 */
function kstStartOfToday(): Date {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  kst.setUTCHours(0, 0, 0, 0);
  return new Date(kst.getTime() - 9 * 60 * 60 * 1000);
}

/** KST 기준 이번 주 월요일 0시 */
function kstStartOfWeek(): Date {
  const todayStart = kstStartOfToday();
  const kst = new Date(todayStart.getTime() + 9 * 60 * 60 * 1000);
  const day = kst.getUTCDay(); // 0=일요일
  const diff = day === 0 ? 6 : day - 1;
  return new Date(todayStart.getTime() - diff * 24 * 60 * 60 * 1000);
}

/** KST 기준 이번 달 1일 0시 */
function kstStartOfMonth(): Date {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  kst.setUTCDate(1);
  kst.setUTCHours(0, 0, 0, 0);
  return new Date(kst.getTime() - 9 * 60 * 60 * 1000);
}

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 대시보드 요약 집계 — 매출/후원/가입/신고 대기/문의 대기.
   * 라이브 수·동시 시청자는 GET live + Redis viewerCount로 프론트가 계산한다.
   */
  async getSummary() {
    const todayStart = kstStartOfToday();
    const weekStart = kstStartOfWeek();
    const monthStart = kstStartOfMonth();

    const [
      salesToday,
      salesWeek,
      salesMonth,
      refundToday,
      donationsToday,
      donationsWeek,
      todaySignups,
      pendingReports,
      pendingInquiries,
    ] = await Promise.all([
      this.sumSales(todayStart),
      this.sumSales(weekStart),
      this.sumSales(monthStart),
      this.prisma.paymentTransaction.aggregate({
        _sum: { amount: true },
        where: {
          status: PaymentTransactionStatus.CANCELED,
          canceled_at: { gte: todayStart },
        },
      }),
      this.sumDonations(todayStart),
      this.sumDonations(weekStart),
      this.prisma.user.count({ where: { created_at: { gte: todayStart } } }),
      this.prisma.report.count({ where: { status: ReportStatus.PENDING } }),
      this.prisma.inquiry.count({ where: { status: InquiryStatus.PENDING } }),
    ]);

    return {
      sales: {
        today: salesToday,
        week: salesWeek,
        month: salesMonth,
        todayRefund: refundToday._sum.amount ?? 0,
      },
      donations: {
        todayCoins: donationsToday,
        weekCoins: donationsWeek,
      },
      users: {
        todaySignups,
        // 탈퇴는 하드 딜리트로 기록이 남지 않아 현재 집계 불가 (항상 0)
        todayWithdrawals: 0,
      },
      reports: {
        pending: pendingReports,
      },
      inquiries: {
        pending: pendingInquiries,
      },
    };
  }

  private async sumSales(since: Date): Promise<number> {
    const result = await this.prisma.paymentTransaction.aggregate({
      _sum: { amount: true },
      where: {
        status: PaymentTransactionStatus.SUCCESS,
        paid_at: { gte: since },
      },
    });
    return result._sum.amount ?? 0;
  }

  private async sumDonations(since: Date): Promise<number> {
    const result = await this.prisma.donation.aggregate({
      _sum: { coin_amount: true },
      where: { donated_at: { gte: since } },
    });
    return result._sum.coin_amount ?? 0;
  }
}
