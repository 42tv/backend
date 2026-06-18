import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SettlementRepository } from './settlement.repository';
import { PayoutCoinRepository } from '../payout-coin/payout-coin.repository';
import { PrismaService } from '../prisma/prisma.service';
import {
  Prisma,
  SettlementStatus,
  PayoutStatus,
  SettlementAccountVerificationStatus,
  StreamerBusinessType,
  SettlementAuditAction,
} from '@prisma/client';
import { RequestSettlementDto } from './dto/request-settlement.dto';
import { PgPayoutService } from './pg-payout.service';

@Injectable()
export class SettlementService {
  private readonly FEE_RATE = 0.1;
  private readonly INCOME_TAX_RATE = 0.03; // 소득세 3% (국세, 홈택스)
  private readonly LOCAL_TAX_RATE = 0.1; // 지방소득세 = 소득세액의 10% (지방세, 위택스)
  private readonly logger = new Logger(SettlementService.name);

  /**
   * 정산 금액 계산 (수수료·원천징수·실지급액)
   * @param totalValue 정산 대상 코인 합산액
   * @param taxable 원천징수 대상 여부 (개인/개인사업자=true, 법인=false)
   */
  private calculateAmounts(totalValue: number, taxable: boolean) {
    const feeAmount = Math.floor(totalValue * this.FEE_RATE);
    const taxBase = totalValue - feeAmount; // 과세표준 (수수료 차감 후 순 지급대가)
    const incomeTax = taxable ? Math.floor(taxBase * this.INCOME_TAX_RATE) : 0;
    const localTax = taxable ? Math.floor(incomeTax * this.LOCAL_TAX_RATE) : 0;
    const withholdingTax = incomeTax + localTax; // 합계(≈3.3%)
    const payoutAmount = totalValue - feeAmount - withholdingTax;
    return {
      feeAmount,
      taxBase,
      incomeTax,
      localTax,
      withholdingTax,
      payoutAmount,
    };
  }

  /**
   * 원천징수 대상 여부 판정
   * 개인/개인사업자=과세(true), 법인=비과세(false)
   */
  private async isTaxable(
    streamerIdx: number,
    tx: Prisma.TransactionClient,
  ): Promise<boolean> {
    const streamer = await this.settlementRepository.findStreamerBusinessType(
      streamerIdx,
      tx,
    );
    return streamer?.business_type !== StreamerBusinessType.CORPORATION;
  }

  constructor(
    private readonly settlementRepository: SettlementRepository,
    private readonly payoutCoinRepository: PayoutCoinRepository,
    private readonly prisma: PrismaService,
    private readonly pgPayoutService: PgPayoutService,
  ) {}

  /**
   * 정산 생성 (스트리머 또는 관리자 요청)
   * @param streamerIdx 스트리머 인덱스
   * @param payoutCoinIds 정산할 PayoutCoin ID 배열
   * @param options 추가 옵션 (지급 방법, 계좌 등)
   * @returns 생성된 Settlement
   */
  async createSettlement(streamerIdx: number, payoutCoinIds: string[]) {
    if (payoutCoinIds.length === 0) {
      throw new BadRequestException('PayoutCoin IDs are required');
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. PayoutCoin들을 조회하고 검증
      const coins = await this.payoutCoinRepository.findByIds(
        payoutCoinIds,
        tx,
      );

      // 존재하지 않는 PayoutCoin 확인
      const foundIds = new Set(coins.map((coin) => coin.id));
      const notFoundIds = payoutCoinIds.filter((id) => !foundIds.has(id));

      if (notFoundIds.length > 0) {
        throw new NotFoundException(
          `PayoutCoins not found: ${notFoundIds.join(', ')}`,
        );
      }

      // 모든 PayoutCoin이 AVAILABLE 상태인지 검증
      const notAvailableCoins = coins.filter(
        (coin) => coin.status !== PayoutStatus.AVAILABLE,
      );

      if (notAvailableCoins.length > 0) {
        throw new BadRequestException(
          `Some PayoutCoins are not AVAILABLE: ${notAvailableCoins.map((c) => c.id).join(', ')}`,
        );
      }

      // 모든 PayoutCoin이 같은 스트리머 것인지 확인
      const differentStreamer = coins.filter(
        (coin) => coin.streamer_idx !== streamerIdx,
      );

      if (differentStreamer.length > 0) {
        throw new BadRequestException(
          'All PayoutCoins must belong to the same streamer',
        );
      }

      // 2. 금액 계산 (수수료 + 원천징수)
      const totalValue = coins.reduce((sum, coin) => sum + coin.coin_value, 0);
      const taxable = await this.isTaxable(streamerIdx, tx);
      const {
        feeAmount,
        taxBase,
        incomeTax,
        localTax,
        withholdingTax,
        payoutAmount,
      } = this.calculateAmounts(totalValue, taxable);

      // 3. Settlement 생성
      const settlement = await this.settlementRepository.create(
        {
          streamer: {
            connect: { idx: streamerIdx },
          },
          total_value: totalValue,
          fee_amount: feeAmount,
          tax_base: taxBase,
          income_tax_amount: incomeTax,
          local_tax_amount: localTax,
          withholding_tax_amount: withholdingTax,
          payout_amount: payoutAmount,
          status: SettlementStatus.PENDING,
        },
        tx,
      );

      // 4. PayoutCoin들을 IN_SETTLEMENT으로 변경 및 settlement 연결
      await this.payoutCoinRepository.updateStatusBatch(
        payoutCoinIds,
        PayoutStatus.IN_SETTLEMENT,
        tx,
      );
      await this.payoutCoinRepository.linkToSettlement(
        payoutCoinIds,
        settlement.id,
        tx,
      );

      return settlement;
    });
  }

  /**
   * 금액 기반 정산 신청 (스트리머)
   * MATURED 코인을 settlement_ready_at 오름차순(FIFO)으로 선택
   */
  async requestSettlement(streamerIdx: number, dto: RequestSettlementDto) {
    return await this.prisma.$transaction(async (tx) => {
      const account =
        await this.settlementRepository.findSettlementAccountByUserIdx(
          streamerIdx,
          tx,
        );

      if (!account) {
        throw new NotFoundException('등록된 정산 계좌가 없습니다.');
      }
      if (account.deleted_at) {
        throw new BadRequestException('삭제된 계좌입니다.');
      }
      if (
        account.verification_status !==
        SettlementAccountVerificationStatus.VERIFIED
      ) {
        throw new BadRequestException('인증된 계좌만 정산 신청이 가능합니다.');
      }

      const { coins, totalValue } =
        await this.payoutCoinRepository.findAvailableCoinsByAmount(
          streamerIdx,
          dto.amount,
        );

      if (coins.length === 0 || totalValue < dto.amount) {
        throw new BadRequestException('정산 가능한 코인이 부족합니다.');
      }

      const taxable = await this.isTaxable(streamerIdx, tx);
      const {
        feeAmount,
        taxBase,
        incomeTax,
        localTax,
        withholdingTax,
        payoutAmount,
      } = this.calculateAmounts(totalValue, taxable);

      const settlement = await this.settlementRepository.create(
        {
          streamer: { connect: { idx: streamerIdx } },
          settlementAccount: { connect: { id: account.id } },
          total_value: totalValue,
          fee_amount: feeAmount,
          tax_base: taxBase,
          income_tax_amount: incomeTax,
          local_tax_amount: localTax,
          withholding_tax_amount: withholdingTax,
          payout_amount: payoutAmount,
          status: SettlementStatus.PENDING,
        },
        tx,
      );

      const coinIds = coins.map((c) => c.id);
      await this.payoutCoinRepository.updateStatusBatch(
        coinIds,
        PayoutStatus.IN_SETTLEMENT,
        tx,
      );
      await this.payoutCoinRepository.linkToSettlement(
        coinIds,
        settlement.id,
        tx,
      );

      const { settlement_account_id: _, ...result } = settlement;
      return result;
    });
  }

  /**
   * 정산 승인 (관리자)
   * PENDING → APPROVED → PG 지급 요청 → PAID
   * PG 실패 시 APPROVED → PENDING 롤백
   */
  async approveSettlement(settlementId: string, adminIdx: number) {
    const settlement = await this.settlementRepository.findById(settlementId);

    if (!settlement) {
      throw new NotFoundException('Settlement not found');
    }

    if (settlement.status !== SettlementStatus.PENDING) {
      throw new BadRequestException(
        `Cannot approve settlement with status: ${settlement.status}`,
      );
    }

    // 1. APPROVED 상태로 변경 + 감사 로그(APPROVE) 동일 트랜잭션
    await this.prisma.$transaction(async (tx) => {
      await this.settlementRepository.approve(settlementId, tx);
      await this.createAuditLog(tx, {
        settlementId,
        adminIdx,
        action: 'APPROVE',
        beforeStatus: SettlementStatus.PENDING,
        afterStatus: SettlementStatus.APPROVED,
      });
    });

    try {
      // 2. PG사 지급 요청 (개발 단계: 항상 성공 처리)
      const payoutResult = await this.pgPayoutService.requestPayout({
        settlementId,
        amount: settlement.payout_amount,
      });

      if (!payoutResult.success) {
        throw new Error(payoutResult.error ?? 'PG payout failed');
      }

      // 3. 지급 완료 처리: PAID + payoutCoins COMPLETED + 감사 로그(PAY)
      return await this.prisma.$transaction(async (tx) => {
        const payoutCoinIds = settlement.payoutCoins.map((coin) => coin.id);
        await this.payoutCoinRepository.updateStatusBatch(
          payoutCoinIds,
          PayoutStatus.COMPLETED,
          tx,
        );
        const paid = await this.settlementRepository.markAsPaid(
          settlementId,
          tx,
        );
        await this.createAuditLog(tx, {
          settlementId,
          adminIdx,
          action: 'PAY',
          beforeStatus: SettlementStatus.APPROVED,
          afterStatus: SettlementStatus.PAID,
        });
        return paid;
      });
    } catch (error) {
      // 4. PG 실패 시 PENDING으로 롤백 + 감사 로그(PAY_FAILED)
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `PG payout failed for settlement ${settlementId}: ${message}`,
      );
      await this.prisma.$transaction(async (tx) => {
        await this.settlementRepository.updateStatus(
          settlementId,
          SettlementStatus.PENDING,
          { approved_at: null },
          tx,
        );
        await this.createAuditLog(tx, {
          settlementId,
          adminIdx,
          action: 'PAY_FAILED',
          beforeStatus: SettlementStatus.APPROVED,
          afterStatus: SettlementStatus.PENDING,
          reason: message,
        });
      });
      throw new InternalServerErrorException(`정산 지급 처리 실패: ${message}`);
    }
  }

  /**
   * 정산 거절 (관리자)
   * @param settlementId Settlement ID
   * @param reason 거절 사유
   * @returns 업데이트된 Settlement
   */
  async rejectSettlement(
    settlementId: string,
    reason: string,
    adminIdx: number,
  ) {
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Reject reason is required');
    }

    return await this.prisma.$transaction(async (tx) => {
      const settlement = await this.settlementRepository.findById(settlementId);

      if (!settlement) {
        throw new NotFoundException('Settlement not found');
      }

      if (settlement.status !== SettlementStatus.PENDING) {
        throw new BadRequestException(
          `Cannot reject settlement with status: ${settlement.status}`,
        );
      }

      // 1. Settlement를 REJECTED로 변경
      await this.settlementRepository.reject(settlementId, reason, tx);

      // 2. 연결된 PayoutCoin들을 다시 AVAILABLE로 되돌림
      const payoutCoinIds = settlement.payoutCoins.map((coin) => coin.id);
      await this.payoutCoinRepository.updateStatusBatch(
        payoutCoinIds,
        PayoutStatus.AVAILABLE,
        tx,
      );

      // 3. settlement_id 연결 해제
      await this.payoutCoinRepository.unlinkFromSettlement(payoutCoinIds, tx);

      // 4. 감사 로그(REJECT) 기록
      await this.createAuditLog(tx, {
        settlementId,
        adminIdx,
        action: 'REJECT',
        beforeStatus: SettlementStatus.PENDING,
        afterStatus: SettlementStatus.REJECTED,
        reason,
      });

      return settlement;
    });
  }

  /**
   * 정산 행위 감사 로그 기록 (상태 변경과 동일 트랜잭션에서 호출)
   */
  private async createAuditLog(
    tx: Prisma.TransactionClient,
    params: {
      settlementId: string;
      adminIdx: number;
      action: SettlementAuditAction;
      beforeStatus: SettlementStatus;
      afterStatus: SettlementStatus;
      reason?: string;
    },
  ) {
    await this.settlementRepository.createAuditLog(
      {
        settlement_id: params.settlementId,
        admin_idx: params.adminIdx,
        action: params.action,
        before_status: params.beforeStatus,
        after_status: params.afterStatus,
        reason: params.reason ?? null,
      },
      tx,
    );
  }

  /**
   * Settlement 상세 조회
   * @param id Settlement ID
   * @returns Settlement
   */
  async findById(id: string) {
    const settlement = await this.settlementRepository.findById(id);

    if (!settlement) {
      throw new NotFoundException('Settlement not found');
    }

    return settlement;
  }

  /**
   * 스트리머의 Settlement 목록 조회
   * @param streamerIdx 스트리머 인덱스
   * @param options 필터 옵션
   * @returns Settlement 목록
   */
  async findByStreamerIdx(
    streamerIdx: number,
    options?: {
      status?: SettlementStatus;
      limit?: number;
      offset?: number;
    },
  ) {
    return await this.settlementRepository.findByStreamerIdx(
      streamerIdx,
      options,
    );
  }

  /**
   * 승인 대기 중인 Settlement 목록 조회 (관리자용)
   * @returns PENDING 상태의 Settlement 목록
   */
  async findPendingSettlements() {
    return await this.settlementRepository.findPendingSettlements();
  }

  /**
   * 모든 Settlement 조회 (관리자용)
   * @param options 필터 옵션
   * @returns Settlement 목록
   */
  async findAll(options?: {
    status?: SettlementStatus;
    streamerIdx?: number;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    return await this.settlementRepository.findAll(options);
  }

  /**
   * 스트리머의 Settlement 통계 조회
   * @param streamerIdx 스트리머 인덱스
   * @returns 정산 통계
   */
  async getSettlementStats(streamerIdx: number) {
    return await this.settlementRepository.getSettlementStats(streamerIdx);
  }

  /**
   * Settlement 수 조회
   * @param options 필터 옵션
   * @returns Settlement 수
   */
  async count(options?: { status?: SettlementStatus; streamerIdx?: number }) {
    return await this.settlementRepository.count(options);
  }
}
