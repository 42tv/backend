import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { CoinTopupRepository } from './coin-topup.repository';
import { ProcessTopupDto } from './dto/create-coin-topup.dto';
import { ProductService } from '../product/product.service';
import { PaymentTransactionService } from '../payment/payment-transaction.service';
import { CoinBalanceService } from '../coin-balance/coin-balance.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  TopupStatus,
  RefundRequestStatus,
  PaymentTransactionStatus,
  PayoutStatus,
  SettlementStatus,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { BootpayService } from '../bootpay/bootpay.service';
import { AdminAuditLogService } from '../admin-audit-log/admin-audit-log.service';
import { PayoutCoinService } from '../payout-coin/payout-coin.service';
import { UserSnapshot } from '../common/utils/retention.util';

/** 전자상거래법 §17 — 소비자 청약철회 가능 기간 (결제일로부터 7일) */
const WITHDRAWAL_PERIOD_DAYS = 7;

@Injectable()
export class CoinTopupService {
  constructor(
    private readonly coinTopupRepository: CoinTopupRepository,
    private readonly productService: ProductService,
    @Inject(forwardRef(() => PaymentTransactionService))
    private readonly paymentTransactionService: PaymentTransactionService,
    private readonly coinBalanceService: CoinBalanceService,
    private readonly prismaService: PrismaService,
    private readonly bootpayService: BootpayService,
    private readonly auditLogService: AdminAuditLogService,
    @Inject(forwardRef(() => PayoutCoinService))
    private readonly payoutCoinService: PayoutCoinService,
  ) {}

  /**
   * 코인 충전 처리 (결제 성공 후 호출)
   * @param user_idx 사용자 ID
   * @param processDto 충전 처리 데이터
   * @param tx 트랜잭션 클라이언트 (선택사항, 없으면 자체 트랜잭션 생성)
   * @returns 처리된 충전 내역
   */
  async processTopup(
    user_idx: number,
    processDto: ProcessTopupDto,
    tx?: Prisma.TransactionClient,
  ) {
    // 트랜잭션이 전달되면 그대로 사용, 없으면 새로 생성
    if (tx) {
      return await this._processTopupLogic(user_idx, processDto, tx);
    }

    return await this.prismaService.$transaction(async (tx) => {
      return await this._processTopupLogic(user_idx, processDto, tx);
    });
  }

  /**
   * 충전 처리 내부 로직 (트랜잭션 내에서 실행)
   * @private
   */
  private async _processTopupLogic(
    user_idx: number,
    processDto: ProcessTopupDto,
    tx: Prisma.TransactionClient,
  ) {
    // 1. 결제 거래 확인 (트랜잭션 내에서)
    const paymentTransaction = await this.paymentTransactionService.findById(
      processDto.transaction_id,
      tx,
    );

    if (paymentTransaction.status !== PaymentTransactionStatus.SUCCESS) {
      throw new BadRequestException('결제가 완료되지 않은 거래입니다.');
    }

    if (paymentTransaction.user_idx !== user_idx) {
      throw new BadRequestException('본인의 결제 거래가 아닙니다.');
    }

    // 2. 이미 충전 처리된 거래인지 확인 (트랜잭션 내에서)
    const existingTopup = await this.coinTopupRepository.findByTransactionId(
      processDto.transaction_id,
      tx,
    );

    if (existingTopup) {
      throw new BadRequestException('이미 충전 처리된 거래입니다.');
    }

    // 3. 상품 정보 조회 (활성화된 상품만)
    const product = await this.productService.findActiveProduct(
      processDto.product_id,
    );

    // 4. 결제 금액과 상품 가격 일치 확인
    if (paymentTransaction.amount !== product.price) {
      throw new BadRequestException(
        '결제 금액과 상품 가격이 일치하지 않습니다.',
      );
    }

    // 5. 코인 충전 내역 생성
    // 거래 당시 사용자 스냅샷 — user가 없으면(이론상 탈퇴 경합) 결제 거래의 스냅샷으로 폴백
    const txUser = paymentTransaction.user;
    const user_snapshot: UserSnapshot = txUser
      ? {
          user_idx: txUser.idx,
          user_id: txUser.user_id,
          nickname: txUser.nickname,
        }
      : (paymentTransaction.user_snapshot as unknown as UserSnapshot);

    const coinTopup = await this.coinTopupRepository.create(
      {
        transaction_id: processDto.transaction_id,
        bootpay_transaction_id: processDto.bootpay_transaction_id,
        user_idx,
        user_snapshot,
        product_id: processDto.product_id,
        product_name: product.name,
        base_coins: product.base_coins,
        bonus_coins: product.bonus_coins,
        total_coins: product.total_coins,
        remaining_coins: product.total_coins, // 초기값은 total_coins와 동일
        paid_amount: paymentTransaction.amount,
        coin_unit_price: paymentTransaction.amount / product.total_coins,
      },
      tx,
    );

    // 6. 충전 상태를 COMPLETED로 업데이트
    await this.coinTopupRepository.updateStatus(
      coinTopup.id,
      TopupStatus.COMPLETED,
      tx,
    );

    // 7. CoinBalance 업데이트
    await this.coinBalanceService.addCoinsFromTopup(
      user_idx,
      product.total_coins,
      tx,
    );

    return coinTopup;
  }

  /**
   * 충전 내역 조회
   * @param id 충전 내역 ID
   * @returns 충전 내역
   */
  async findById(id: string) {
    const topup = await this.coinTopupRepository.findById(id);
    if (!topup) {
      throw new NotFoundException('존재하지 않는 충전 내역입니다.');
    }
    return topup;
  }

  /**
   * 사용자의 충전 내역 목록 조회
   * @param user_idx 사용자 ID
   * @param limit 조회 제한 수
   * @returns 충전 내역 목록
   */
  async findByUserId(user_idx: number, limit: number = 20) {
    return await this.coinTopupRepository.findByUserId(user_idx, limit);
  }

  /**
   * 사용자의 사용 가능한 충전 내역 조회 (FIFO용)
   * @param user_idx 사용자 ID
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 사용 가능한 충전 내역
   */
  async getAvailableTopups(user_idx: number, tx?: Prisma.TransactionClient) {
    return await this.coinTopupRepository.findAvailableTopupsForUser(
      user_idx,
      tx,
    );
  }

  /**
   * 충전 통계 조회
   * @param user_idx 사용자 ID
   * @returns 충전 통계
   */
  async getTopupStats(user_idx: number) {
    return await this.coinTopupRepository.getTopupStats(user_idx);
  }

  /**
   * 충전 실패 처리
   * @param transaction_id 결제 거래 ID
   * @returns 실패 처리된 충전 내역
   */
  async failTopup(transaction_id: string) {
    const topup =
      await this.coinTopupRepository.findByTransactionId(transaction_id);

    if (!topup) {
      throw new NotFoundException('존재하지 않는 충전 내역입니다.');
    }

    if (topup.status !== TopupStatus.PENDING) {
      throw new BadRequestException('이미 처리된 충전 내역입니다.');
    }

    return await this.coinTopupRepository.updateStatus(
      topup.id,
      TopupStatus.FAILED,
    );
  }

  /**
   * 관리자용 충전 내역 목록 조회
   * @param options 조회 옵션 (상태/검색어 필터 + 페이지네이션)
   * @returns 충전 내역 목록과 전체 개수
   */
  async findAllForAdmin(options: {
    status?: TopupStatus;
    search?: string;
    limit: number;
    offset: number;
  }) {
    return await this.coinTopupRepository.findAllForAdmin(options);
  }

  /**
   * 관리자 결제/정산 통계 조회
   * @returns 결제/코인/정산 대기 코인/정산 통계
   */
  async getAdminPaymentStats() {
    const { topupGroups, payoutGroups, settlementGroups } =
      await this.coinTopupRepository.getAdminStats();

    // 환불 승인 대기(REFUND_REQUESTED) 건은 환불 확정 전이므로 완료 건과 동일 취급
    const completedLike = topupGroups.filter(
      (g) =>
        g.status === TopupStatus.COMPLETED ||
        g.status === TopupStatus.REFUND_REQUESTED,
    );
    const refunded = topupGroups.find((g) => g.status === TopupStatus.REFUNDED);

    const sumCompleted = (
      field:
        | 'total_coins'
        | 'remaining_coins'
        | 'refunded_coins'
        | 'paid_amount',
    ) => completedLike.reduce((sum, g) => sum + (g._sum[field] ?? 0), 0);
    const completedCount = completedLike.reduce(
      (sum, g) => sum + (g._count._all ?? 0),
      0,
    );

    // 환불된 충전 건도 충전/사용 통계에 포함 (사용분 = 충전 - 잔여 - 환불)
    const totalChargedCoins =
      sumCompleted('total_coins') + (refunded?._sum.total_coins ?? 0);
    const totalRemainingCoins =
      sumCompleted('remaining_coins') + (refunded?._sum.remaining_coins ?? 0);
    const totalRefundedCoins =
      sumCompleted('refunded_coins') + (refunded?._sum.refunded_coins ?? 0);

    const payoutCoinsByStatus = (status: PayoutStatus) =>
      payoutGroups.find((g) => g.status === status)?._sum.coin_amount ?? 0;

    const pendingSettlement = settlementGroups.find(
      (g) => g.status === SettlementStatus.PENDING,
    );
    const paidSettlement = settlementGroups.find(
      (g) => g.status === SettlementStatus.PAID,
    );

    return {
      payments: {
        total_paid_amount:
          sumCompleted('paid_amount') + (refunded?._sum.paid_amount ?? 0),
        total_paid_count: completedCount + (refunded?._count._all ?? 0),
        refunded_amount: refunded?._sum.refunded_amount ?? 0,
        refunded_count: refunded?._count._all ?? 0,
      },
      coins: {
        total_charged_coins: totalChargedCoins,
        total_used_coins:
          totalChargedCoins - totalRemainingCoins - totalRefundedCoins,
        total_remaining_coins: totalRemainingCoins,
        total_refunded_coins: totalRefundedCoins,
      },
      payout: {
        waiting_coins: payoutCoinsByStatus(PayoutStatus.WAITING),
        available_coins: payoutCoinsByStatus(PayoutStatus.AVAILABLE),
        blocked_coins: payoutCoinsByStatus(PayoutStatus.BLOCKED),
        in_settlement_coins: payoutCoinsByStatus(PayoutStatus.IN_SETTLEMENT),
        completed_coins: payoutCoinsByStatus(PayoutStatus.COMPLETED),
      },
      settlements: {
        pending_count: pendingSettlement?._count._all ?? 0,
        pending_amount: pendingSettlement?._sum.payout_amount ?? 0,
        paid_count: paidSettlement?._count._all ?? 0,
        paid_amount: paidSettlement?._sum.payout_amount ?? 0,
      },
    };
  }

  /**
   * 환불 처리 (부분 환불) — 관리자용
   * @param topup_id 충전 내역 ID
   * @param adminIdx 처리 관리자 ID
   * @param reason 환불 사유 (감사 로그 기록용)
   * @returns 환불 결과
   */
  async processRefund(topup_id: string, adminIdx: number, reason: string) {
    const topup = await this.findById(topup_id);
    this.assertRefundable(topup);

    return await this.executeRefund(topup, {
      actorIdx: adminIdx,
      pgCancelledBy: 'Admin',
      auditAction: 'TOPUP_REFUND',
      reason,
    });
  }

  /**
   * 사용자 환불 요청 접수 (전자상거래법 §17 청약철회)
   * 즉시 환불하지 않고 관리자 승인 대기(PENDING)로 접수하며,
   * 해당 충전 건을 REFUND_REQUESTED로 잠가 코인 소진을 차단한다.
   * 기간 경과 건은 고객센터(Inquiry) 경유로 관리자가 처리한다.
   * @param topup_id 충전 내역 ID
   * @param user_idx 신청자 (본인 검증)
   * @param userReason 신청 사유 (선택)
   * @returns 생성된 환불 요청
   */
  async createRefundRequest(
    topup_id: string,
    user_idx: number,
    userReason?: string,
  ) {
    const topup = await this.findById(topup_id);

    if (topup.user_idx !== user_idx) {
      throw new NotFoundException('충전 내역을 찾을 수 없습니다.');
    }

    this.assertRefundable(topup);
    this.assertWithinWithdrawalPeriod(topup.topped_up_at);

    return await this.prismaService.$transaction(async (tx) => {
      // 상태 조건부 전환(COMPLETED → REFUND_REQUESTED)이 중복 요청 방지 락
      const locked = await this.coinTopupRepository.lockTopupForRefund(
        topup_id,
        tx,
      );
      if (!locked) {
        throw new BadRequestException('이미 환불이 진행 중인 충전입니다.');
      }

      return await this.coinTopupRepository.createRefundRequest(
        {
          topup_id,
          user_idx,
          remaining_coins: topup.remaining_coins,
          expected_amount: this.calcRefundAmount(topup),
          user_reason: userReason ?? null,
        },
        tx,
      );
    });
  }

  /**
   * 사용자 환불 요청 취소 (승인 전에만 가능)
   * 요청을 CANCELED로 종결하고 충전 건을 COMPLETED로 복원한다.
   * @param request_id 환불 요청 ID
   * @param user_idx 신청자 (본인 검증)
   * @returns 취소 결과
   */
  async cancelRefundRequest(request_id: string, user_idx: number) {
    const request = await this.findPendingRefundRequest(request_id, user_idx);

    await this.prismaService.$transaction(async (tx) => {
      await this.coinTopupRepository.updateRefundRequest(
        request_id,
        { status: RefundRequestStatus.CANCELED },
        tx,
      );
      // 잠금 해제 — 다시 소진/재요청 가능
      await this.coinTopupRepository.updateStatus(
        request.topup_id,
        TopupStatus.COMPLETED,
        tx,
      );
    });

    return {
      request_id,
      topup_id: request.topup_id,
      status: RefundRequestStatus.CANCELED,
    };
  }

  /**
   * 사용자의 환불 요청 목록 조회
   * @param user_idx 사용자 ID
   * @param limit 조회 제한 수
   * @returns 환불 요청 목록
   */
  async getMyRefundRequests(user_idx: number, limit: number = 20) {
    return await this.coinTopupRepository.findRefundRequestsByUser(
      user_idx,
      limit,
    );
  }

  /**
   * 관리자용 환불 요청 목록 조회
   * @param options 조회 옵션 (상태 필터 + 페이지네이션)
   * @returns 환불 요청 목록과 전체 개수
   */
  async findRefundRequestsForAdmin(options: {
    status?: RefundRequestStatus;
    limit: number;
    offset: number;
  }) {
    return await this.coinTopupRepository.findRefundRequestsForAdmin(options);
  }

  /**
   * 환불 요청 승인 (관리자) — PG 취소를 포함한 실제 환불을 실행한다.
   * 전자상거래법 §18① — 청약철회 접수일로부터 3영업일 이내 환급 의무.
   * @param request_id 환불 요청 ID
   * @param adminIdx 처리 관리자 ID
   * @returns 환불 결과
   */
  async approveRefundRequest(request_id: string, adminIdx: number) {
    const request = await this.findPendingRefundRequest(request_id);
    const topup = await this.findById(request.topup_id);

    // 승인 경로는 잠금 상태(REFUND_REQUESTED)를 기대
    this.assertRefundable(topup, TopupStatus.REFUND_REQUESTED);

    const result = await this.executeRefund(topup, {
      actorIdx: adminIdx,
      pgCancelledBy: 'User', // 청약철회 주체는 사용자
      auditAction: 'REFUND_REQUEST_APPROVE',
      reason: `사용자 청약철회 승인 (요청 ${request_id})`,
      onRefunded: async (tx) => {
        await this.coinTopupRepository.updateRefundRequest(
          request_id,
          {
            status: RefundRequestStatus.APPROVED,
            processed_admin_idx: adminIdx,
          },
          tx,
        );
      },
    });

    return { ...result, request_id };
  }

  /**
   * 환불 요청 거절 (관리자) — 사유 필수, 충전 건 잠금 해제.
   * 유효한 청약철회는 임의 거절할 수 없으므로 부정거래 의심 등
   * 예외 사유에 한해 사용한다 (사유는 사용자에게 전달됨을 전제).
   * @param request_id 환불 요청 ID
   * @param adminIdx 처리 관리자 ID
   * @param reason 거절 사유
   * @returns 거절 결과
   */
  async rejectRefundRequest(
    request_id: string,
    adminIdx: number,
    reason: string,
  ) {
    const request = await this.findPendingRefundRequest(request_id);

    await this.prismaService.$transaction(async (tx) => {
      await this.coinTopupRepository.updateRefundRequest(
        request_id,
        {
          status: RefundRequestStatus.REJECTED,
          processed_admin_idx: adminIdx,
          reject_reason: reason,
        },
        tx,
      );
      // 잠금 해제 — 코인 소진 재개
      await this.coinTopupRepository.updateStatus(
        request.topup_id,
        TopupStatus.COMPLETED,
        tx,
      );
      await this.auditLogService.record(
        {
          adminIdx,
          action: 'REFUND_REQUEST_REJECT',
          targetType: 'COIN_REFUND_REQUEST',
          targetId: request_id,
          reason,
          detail: { topup_id: request.topup_id },
        },
        tx,
      );
    });

    return {
      request_id,
      topup_id: request.topup_id,
      status: RefundRequestStatus.REJECTED,
    };
  }

  /**
   * 처리 대기(PENDING) 환불 요청 조회 (본인 검증 선택)
   * @private
   */
  private async findPendingRefundRequest(
    request_id: string,
    user_idx?: number,
  ) {
    const request =
      await this.coinTopupRepository.findRefundRequestById(request_id);

    if (!request || (user_idx !== undefined && request.user_idx !== user_idx)) {
      throw new NotFoundException('환불 요청을 찾을 수 없습니다.');
    }

    if (request.status !== RefundRequestStatus.PENDING) {
      throw new BadRequestException('이미 처리된 환불 요청입니다.');
    }

    return request;
  }

  /** 청약철회 기간(결제일로부터 7일) 검증 */
  private assertWithinWithdrawalPeriod(toppedUpAt: Date) {
    // topped_up_at은 KST naive timestamp — 현재 시각도 동일 표현으로 보정 후 비교
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const deadline = new Date(toppedUpAt);
    deadline.setDate(deadline.getDate() + WITHDRAWAL_PERIOD_DAYS);
    if (kstNow > deadline) {
      throw new BadRequestException(
        '청약철회 기간(결제일로부터 7일)이 지났습니다. 고객센터로 문의해주세요.',
      );
    }
  }

  /** 환불 가능 상태 검증 (관리자/사용자 공통) */
  private assertRefundable(
    topup: {
      status: TopupStatus;
      remaining_coins: number;
    },
    expectedStatus: TopupStatus = TopupStatus.COMPLETED,
  ) {
    // 중복 요청 방지 (이미 환불된 건은 거부)
    if (topup.status === TopupStatus.REFUNDED) {
      throw new BadRequestException('이미 환불 처리된 충전입니다.');
    }

    if (topup.status !== expectedStatus) {
      throw new BadRequestException(
        expectedStatus === TopupStatus.COMPLETED
          ? '완료된 충전만 환불할 수 있습니다.'
          : '환불 요청 상태의 충전이 아닙니다.',
      );
    }

    if (topup.remaining_coins <= 0) {
      throw new BadRequestException('모든 코인이 사용되어 환불할 수 없습니다.');
    }
  }

  /**
   * 환불액 계산 — 잔여 코인 × 단가이되, 보너스 코인은 무상 지급분이므로
   * 실결제액(paid_amount)을 초과하지 않도록 보정한다.
   */
  private calcRefundAmount(topup: {
    remaining_coins: number;
    coin_unit_price: number;
    paid_amount: number;
  }) {
    return Math.min(
      Math.floor(topup.remaining_coins * topup.coin_unit_price),
      topup.paid_amount,
    );
  }

  /**
   * 환불 실행 공통 로직
   * 사용하고 남은 remaining_coins만큼 환불한다.
   */
  private async executeRefund(
    topup: Awaited<ReturnType<CoinTopupService['findById']>>,
    params: {
      actorIdx: number;
      pgCancelledBy: string;
      auditAction: string;
      reason: string;
      /** 환불 DB 트랜잭션 내에서 함께 실행할 후처리 (요청 상태 갱신 등) */
      onRefunded?: (tx: Prisma.TransactionClient) => Promise<void>;
    },
  ) {
    const refundedCoins = topup.remaining_coins;
    const refundedAmount = this.calcRefundAmount(topup);

    // Bootpay 결제 취소 (PG 결제 건인 경우)
    // cancel_id를 topup 기준으로 고정해 PG 측 중복 취소를 방지한다 (멱등성)
    const receiptId = topup.transaction?.bootpay_receipt_id;
    if (receiptId && refundedAmount > 0) {
      const isFullRefund = refundedCoins === topup.total_coins;
      const cancelResult = await this.bootpayService.cancelPayment(
        receiptId,
        isFullRefund ? undefined : refundedAmount, // 전액 잔여면 전체 취소
        params.pgCancelledBy,
        params.reason,
        `refund_${topup.id}`,
      );

      if (!cancelResult.success) {
        throw new BadRequestException(
          `PG 환불 처리에 실패했습니다: ${cancelResult.error}`,
        );
      }
    }

    await this.prismaService.$transaction(async (tx) => {
      // 잔여 코인을 refunded_coins로 이관 + REFUNDED 상태 전환
      await this.coinTopupRepository.markRefunded(
        topup.id,
        refundedCoins,
        refundedAmount,
        tx,
      );

      // CoinBalance에서 환불된 코인 차감 (탈퇴 유저는 잔액 정보가 없음)
      if (topup.user_idx !== null) {
        await this.coinBalanceService.refundCoins(
          topup.user_idx,
          refundedCoins,
          tx,
        );
      }

      await this.auditLogService.record(
        {
          adminIdx: params.actorIdx,
          action: params.auditAction,
          targetType: 'COIN_TOPUP',
          targetId: topup.id,
          reason: params.reason,
          detail: {
            refunded_coins: refundedCoins,
            refunded_amount: refundedAmount,
            paid_amount: topup.paid_amount,
            total_coins: topup.total_coins,
          },
        },
        tx,
      );

      if (params.onRefunded) {
        await params.onRefunded(tx);
      }
    });

    return {
      topup_id: topup.id,
      refunded_coins: refundedCoins,
      refunded_amount: refundedAmount,
      status: TopupStatus.REFUNDED,
    };
  }

  /**
   * CoinTopup을 FROZEN 상태로 변경하고 관련 PayoutCoin 차단
   * @param topupId CoinTopup ID
   * @param reason 차단 사유
   * @returns 처리 결과
   */
  async freezeTopup(topupId: string, reason: string) {
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Freeze reason is required');
    }

    return await this.prismaService.$transaction(async (tx) => {
      const topup = await this.findById(topupId);

      if (topup.status !== TopupStatus.COMPLETED) {
        throw new BadRequestException('Only COMPLETED topups can be frozen');
      }

      // 1. CoinTopup을 FROZEN으로 변경
      await this.coinTopupRepository.updateStatus(
        topupId,
        TopupStatus.FROZEN,
        tx,
      );

      // 2. 관련 PayoutCoin들을 BLOCKED로 변경
      const blockedCount = await this.payoutCoinService.blockPayoutCoinsByTopup(
        topupId,
        reason,
        tx,
      );

      return {
        topup_id: topupId,
        status: TopupStatus.FROZEN,
        blocked_payout_coins: blockedCount,
        reason,
      };
    });
  }

  /**
   * FROZEN 상태의 CoinTopup 해제
   * @param topupId CoinTopup ID
   * @returns 업데이트된 CoinTopup
   */
  async unfreezeTopup(topupId: string) {
    const topup = await this.findById(topupId);

    if (topup.status !== TopupStatus.FROZEN) {
      throw new BadRequestException('Topup is not frozen');
    }

    // CoinTopup을 다시 COMPLETED로 변경
    // 관련 PayoutCoin은 관리자가 수동으로 검토 후 해제해야 함
    return await this.coinTopupRepository.updateStatus(
      topupId,
      TopupStatus.COMPLETED,
    );
  }
}
