import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, PayoutStatus } from '@prisma/client';

@Injectable()
export class PayoutCoinRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * PayoutCoin 생성
   * @param data PayoutCoin 생성 데이터
   * @param tx 트랜잭션 클라이언트 (선택)
   * @returns 생성된 PayoutCoin
   */
  async create(
    data: Prisma.PayoutCoinCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return await client.payoutCoin.create({
      data,
    });
  }

  /**
   * PayoutCoin 일괄 생성
   * @param dataArray PayoutCoin 생성 데이터 배열
   * @param tx 트랜잭션 클라이언트 (선택)
   * @returns 생성 결과
   */
  async createBatch(
    dataArray: Prisma.PayoutCoinCreateManyInput[],
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return await client.payoutCoin.createMany({
      data: dataArray,
    });
  }

  /**
   * ID로 PayoutCoin 조회
   * @param id PayoutCoin ID
   * @returns PayoutCoin 또는 null
   */
  async findById(id: string) {
    return await this.prisma.payoutCoin.findUnique({
      where: { id },
      include: {
        streamer: true,
        donation: true,
        usage: true,
        topup: true,
        settlement: true,
      },
    });
  }

  /**
   * 스트리머의 PayoutCoin 목록 조회
   * @param streamerIdx 스트리머 인덱스
   * @param options 필터 옵션 (status, 날짜 범위 등)
   * @returns PayoutCoin 목록
   */
  async findByStreamerIdx(
    streamerIdx: number,
    options?: {
      status?: PayoutStatus;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: Prisma.PayoutCoinWhereInput = {
      streamer_idx: streamerIdx,
    };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.startDate || options?.endDate) {
      where.donated_at = {};
      if (options.startDate) {
        where.donated_at.gte = options.startDate;
      }
      if (options.endDate) {
        where.donated_at.lte = options.endDate;
      }
    }

    return await this.prisma.payoutCoin.findMany({
      where,
      include: {
        donation: true,
        topup: true,
        settlement: true,
      },
      orderBy: {
        donated_at: 'desc',
      },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });
  }

  /**
   * Donation ID로 PayoutCoin 조회
   * @param donationId Donation ID
   * @returns PayoutCoin 목록
   */
  async findByDonationId(donationId: string) {
    return await this.prisma.payoutCoin.findMany({
      where: { donation_id: donationId },
      include: {
        usage: true,
        topup: true,
      },
    });
  }

  /**
   * Topup ID로 PayoutCoin 조회
   * @param topupId CoinTopup ID
   * @returns PayoutCoin 목록
   */
  async findByTopupId(topupId: string) {
    return await this.prisma.payoutCoin.findMany({
      where: { topup_id: topupId },
      include: {
        donation: true,
        usage: true,
      },
    });
  }

  /**
   * Settlement ID로 PayoutCoin 조회
   * @param settlementId Settlement ID
   * @returns PayoutCoin 목록
   */
  async findBySettlementId(settlementId: string) {
    return await this.prisma.payoutCoin.findMany({
      where: { settlement_id: settlementId },
      include: {
        donation: true,
        usage: true,
        topup: true,
      },
      orderBy: {
        donated_at: 'asc',
      },
    });
  }

  /**
   * 정산 가능한 PayoutCoin 조회 (status=MATURED)
   * @param streamerIdx 스트리머 인덱스
   * @param options 필터 옵션
   * @returns MATURED 상태의 PayoutCoin 목록
   */
  async findMaturedCoins(
    streamerIdx: number,
    options?: {
      limit?: number;
      offset?: number;
    },
  ) {
    return await this.prisma.payoutCoin.findMany({
      where: {
        streamer_idx: streamerIdx,
        status: PayoutStatus.MATURED,
      },
      include: {
        donation: true,
        topup: true,
      },
      orderBy: {
        settlement_ready_at: 'asc',
      },
      take: options?.limit || 100,
      skip: options?.offset || 0,
    });
  }

  /**
   * 대기 중인 PayoutCoin 조회 (status=PENDING)
   * @param streamerIdx 스트리머 인덱스
   * @returns PENDING 상태의 PayoutCoin 목록
   */
  async findPendingCoins(streamerIdx: number) {
    return await this.prisma.payoutCoin.findMany({
      where: {
        streamer_idx: streamerIdx,
        status: PayoutStatus.PENDING,
      },
      orderBy: {
        settlement_ready_at: 'asc',
      },
    });
  }

  /**
   * 차단된 PayoutCoin 조회 (status=BLOCKED)
   * @param streamerIdx 스트리머 인덱스
   * @returns BLOCKED 상태의 PayoutCoin 목록
   */
  async findBlockedCoins(streamerIdx: number) {
    return await this.prisma.payoutCoin.findMany({
      where: {
        streamer_idx: streamerIdx,
        status: PayoutStatus.BLOCKED,
      },
      include: {
        topup: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  /**
   * 정산 준비가 완료된 PENDING 코인 조회 (스케줄러용)
   * @returns settlement_ready_at이 현재보다 이전이고 status=PENDING인 PayoutCoin 목록
   */
  async findPendingReadyCoins() {
    return await this.prisma.payoutCoin.findMany({
      where: {
        status: PayoutStatus.PENDING,
        settlement_ready_at: {
          lte: new Date(),
        },
      },
      include: {
        topup: true,
      },
    });
  }

  /**
   * PayoutCoin 상태 업데이트
   * @param id PayoutCoin ID
   * @param status 새로운 상태
   * @param tx 트랜잭션 클라이언트 (선택)
   * @returns 업데이트된 PayoutCoin
   */
  async updateStatus(
    id: string,
    status: PayoutStatus,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return await client.payoutCoin.update({
      where: { id },
      data: {
        status,
        last_reviewed_at: new Date(),
      },
    });
  }

  /**
   * PayoutCoin 상태 일괄 업데이트
   * @param ids PayoutCoin ID 배열
   * @param status 새로운 상태
   * @param tx 트랜잭션 클라이언트 (선택)
   * @returns 업데이트 결과
   */
  async updateStatusBatch(
    ids: string[],
    status: PayoutStatus,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return await client.payoutCoin.updateMany({
      where: {
        id: { in: ids },
      },
      data: {
        status,
        last_reviewed_at: new Date(),
      },
    });
  }

  /**
   * Topup ID로 관련 PayoutCoin 차단
   * @param topupId CoinTopup ID
   * @param reason 차단 사유
   * @param tx 트랜잭션 클라이언트 (선택)
   * @returns 업데이트 결과
   */
  async blockByTopupId(
    topupId: string,
    reason: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return await client.payoutCoin.updateMany({
      where: {
        topup_id: topupId,
        status: {
          in: [PayoutStatus.PENDING, PayoutStatus.MATURED],
        },
      },
      data: {
        status: PayoutStatus.BLOCKED,
        block_reason: 'TOPUP_FROZEN',
        blocked_topup_reason: reason,
        last_reviewed_at: new Date(),
      },
    });
  }

  /**
   * PayoutCoin들을 Settlement에 연결
   * @param ids PayoutCoin ID 배열
   * @param settlementId Settlement ID
   * @param tx 트랜잭션 클라이언트 (선택)
   * @returns 업데이트 결과
   */
  async linkToSettlement(
    ids: string[],
    settlementId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    return await client.payoutCoin.updateMany({
      where: {
        id: { in: ids },
      },
      data: {
        settlement_id: settlementId,
      },
    });
  }

  /**
   * 스트리머의 PayoutCoin 요약 조회
   * @param streamerIdx 스트리머 인덱스
   * @returns 상태별 금액 합계
   */
  async getPayoutSummary(streamerIdx: number) {
    const [matured, pending, blocked, settled] = await Promise.all([
      // MATURED 상태 금액 합계
      this.prisma.payoutCoin.aggregate({
        where: {
          streamer_idx: streamerIdx,
          status: PayoutStatus.MATURED,
        },
        _sum: {
          coin_value: true,
        },
      }),
      // PENDING 상태 금액 합계
      this.prisma.payoutCoin.aggregate({
        where: {
          streamer_idx: streamerIdx,
          status: PayoutStatus.PENDING,
        },
        _sum: {
          coin_value: true,
        },
      }),
      // BLOCKED 상태 금액 합계
      this.prisma.payoutCoin.aggregate({
        where: {
          streamer_idx: streamerIdx,
          status: PayoutStatus.BLOCKED,
        },
        _sum: {
          coin_value: true,
        },
      }),
      // SETTLED 상태 금액 합계
      this.prisma.payoutCoin.aggregate({
        where: {
          streamer_idx: streamerIdx,
          status: PayoutStatus.SETTLED,
        },
        _sum: {
          coin_value: true,
        },
      }),
    ]);

    return {
      matured_amount: matured._sum.coin_value || 0,
      pending_amount: pending._sum.coin_value || 0,
      blocked_amount: blocked._sum.coin_value || 0,
      settled_amount: settled._sum.coin_value || 0,
      total_received:
        (matured._sum.coin_value || 0) +
        (pending._sum.coin_value || 0) +
        (blocked._sum.coin_value || 0) +
        (settled._sum.coin_value || 0),
    };
  }

  /**
   * 정산 가능 금액 조회
   * @param streamerIdx 스트리머 인덱스
   * @returns MATURED 상태의 총 금액
   */
  async getTotalMaturedAmount(streamerIdx: number) {
    const result = await this.prisma.payoutCoin.aggregate({
      where: {
        streamer_idx: streamerIdx,
        status: PayoutStatus.MATURED,
      },
      _sum: {
        coin_value: true,
      },
    });

    return result._sum.coin_value || 0;
  }

  /**
   * CoinTopup 조회 (트랜잭션 컨텍스트)
   * @param topupId CoinTopup ID
   * @param tx 트랜잭션 클라이언트 (선택)
   * @returns CoinTopup 또는 null
   */
  async findTopupById(topupId: string, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return await client.coinTopup.findUnique({
      where: { id: topupId },
    });
  }
}
