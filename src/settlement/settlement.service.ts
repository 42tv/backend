import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { SettlementRepository } from './settlement.repository';
import { PayoutCoinRepository } from '../payout-coin/payout-coin.repository';
import { PrismaService } from '../prisma/prisma.service';
import { SettlementStatus, PayoutStatus } from '@prisma/client';

@Injectable()
export class SettlementService {
  // 수수료율 (10%)
  private readonly FEE_RATE = 0.1;

  constructor(
    private readonly settlementRepository: SettlementRepository,
    private readonly payoutCoinRepository: PayoutCoinRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 정산 생성 (스트리머 또는 관리자 요청)
   * @param streamerIdx 스트리머 인덱스
   * @param payoutCoinIds 정산할 PayoutCoin ID 배열
   * @param options 추가 옵션 (지급 방법, 계좌 등)
   * @returns 생성된 Settlement
   */
  async createSettlement(
    streamerIdx: number,
    payoutCoinIds: string[],
    options?: {
      payout_method?: string;
      payout_account?: string;
      admin_memo?: string;
    },
  ) {
    if (payoutCoinIds.length === 0) {
      throw new BadRequestException('PayoutCoin IDs are required');
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. PayoutCoin들을 조회하고 검증
      const coins = await Promise.all(
        payoutCoinIds.map((id) => tx.payoutCoin.findUnique({ where: { id } })),
      );

      // 존재하지 않는 PayoutCoin 확인
      const notFoundIds = coins
        .map((coin, idx) => (coin === null ? payoutCoinIds[idx] : null))
        .filter((id) => id !== null);

      if (notFoundIds.length > 0) {
        throw new NotFoundException(
          `PayoutCoins not found: ${notFoundIds.join(', ')}`,
        );
      }

      // 모든 PayoutCoin이 MATURED 상태인지 검증
      const validCoins = coins.filter((coin) => coin !== null);
      const notMaturedCoins = validCoins.filter(
        (coin) => coin.status !== PayoutStatus.MATURED,
      );

      if (notMaturedCoins.length > 0) {
        throw new BadRequestException(
          `Some PayoutCoins are not MATURED: ${notMaturedCoins.map((c) => c.id).join(', ')}`,
        );
      }

      // 모든 PayoutCoin이 같은 스트리머 것인지 확인
      const differentStreamer = validCoins.filter(
        (coin) => coin.streamer_idx !== streamerIdx,
      );

      if (differentStreamer.length > 0) {
        throw new BadRequestException(
          'All PayoutCoins must belong to the same streamer',
        );
      }

      // 2. 금액 계산
      const totalValue = validCoins.reduce(
        (sum, coin) => sum + coin.coin_value,
        0,
      );
      const feeAmount = Math.floor(totalValue * this.FEE_RATE);
      const payoutAmount = totalValue - feeAmount;

      // 정산 기간 계산 (donated_at 기준)
      const donatedDates = validCoins.map((coin) => coin.donated_at);
      const periodStart = new Date(
        Math.min(...donatedDates.map((d) => d.getTime())),
      );
      const periodEnd = new Date(
        Math.max(...donatedDates.map((d) => d.getTime())),
      );

      // 3. Settlement 생성
      const settlement = await this.settlementRepository.create(
        {
          streamer: {
            connect: { idx: streamerIdx },
          },
          period_start: periodStart,
          period_end: periodEnd,
          total_value: totalValue,
          fee_amount: feeAmount,
          payout_amount: payoutAmount,
          status: SettlementStatus.PENDING,
          payout_method: options?.payout_method,
          payout_account: options?.payout_account, // TODO: 암호화 필요
          admin_memo: options?.admin_memo,
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
  async requestSettlement(
    streamerIdx: number,
    amount: number,
    options?: {
      payout_method?: string;
      payout_account?: string;
    },
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    return await this.prisma.$transaction(async (tx) => {
      const { coins, totalValue } =
        await this.payoutCoinRepository.findMaturedCoinsByAmount(
          streamerIdx,
          amount,
        );

      if (coins.length === 0) {
        throw new BadRequestException(
          'No matured coins available for settlement',
        );
      }

      if (totalValue < amount) {
        throw new BadRequestException(
          `Requested amount ${amount} exceeds available matured amount ${totalValue}`,
        );
      }

      const feeAmount = Math.floor(totalValue * this.FEE_RATE);
      const payoutAmount = totalValue - feeAmount;

      const donatedDates = coins.map((c) => c.donated_at);
      const periodStart = new Date(
        Math.min(...donatedDates.map((d) => d.getTime())),
      );
      const periodEnd = new Date(
        Math.max(...donatedDates.map((d) => d.getTime())),
      );

      const settlement = await this.settlementRepository.create(
        {
          streamer: { connect: { idx: streamerIdx } },
          period_start: periodStart,
          period_end: periodEnd,
          total_value: totalValue,
          fee_amount: feeAmount,
          payout_amount: payoutAmount,
          status: SettlementStatus.PENDING,
          payout_method: options?.payout_method,
          payout_account: options?.payout_account,
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

      return settlement;
    });
  }

  /**
   * 정산 승인 (관리자)
   * @param settlementId Settlement ID
   * @returns 업데이트된 Settlement
   */
  async approveSettlement(settlementId: string) {
    const settlement = await this.settlementRepository.findById(settlementId);

    if (!settlement) {
      throw new NotFoundException('Settlement not found');
    }

    if (settlement.status !== SettlementStatus.PENDING) {
      throw new BadRequestException(
        `Cannot approve settlement with status: ${settlement.status}`,
      );
    }

    return await this.settlementRepository.approve(settlementId, new Date());
  }

  /**
   * 정산 지급 완료 처리 (관리자)
   * @param settlementId Settlement ID
   * @returns 업데이트된 Settlement
   */
  async markSettlementAsPaid(settlementId: string) {
    const settlement = await this.settlementRepository.findById(settlementId);

    if (!settlement) {
      throw new NotFoundException('Settlement not found');
    }

    if (settlement.status !== SettlementStatus.APPROVED) {
      throw new BadRequestException(
        `Cannot mark as paid settlement with status: ${settlement.status}`,
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      const payoutCoinIds = settlement.payoutCoins.map((coin) => coin.id);
      await this.payoutCoinRepository.updateStatusBatch(
        payoutCoinIds,
        PayoutStatus.SETTLED,
        tx,
      );

      return await this.settlementRepository.markAsPaid(
        settlementId,
        new Date(),
        tx,
      );
    });
  }

  /**
   * 정산 거절 (관리자)
   * @param settlementId Settlement ID
   * @param reason 거절 사유
   * @returns 업데이트된 Settlement
   */
  async rejectSettlement(settlementId: string, reason: string) {
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
      await this.settlementRepository.reject(
        settlementId,
        reason,
        new Date(),
        tx,
      );

      // 2. 연결된 PayoutCoin들을 다시 MATURED로 되돌림
      const payoutCoinIds = settlement.payoutCoins.map((coin) => coin.id);
      await this.payoutCoinRepository.updateStatusBatch(
        payoutCoinIds,
        PayoutStatus.MATURED,
        tx,
      );

      // 3. settlement_id 연결 해제
      await tx.payoutCoin.updateMany({
        where: { id: { in: payoutCoinIds } },
        data: { settlement_id: null },
      });

      return settlement;
    });
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
