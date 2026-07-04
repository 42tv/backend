import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TopupStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CoinBalanceService } from 'src/coin-balance/coin-balance.service';
import { CoinUsageService } from 'src/coin-usage/coin-usage.service';
import { UserService } from 'src/user/user.service';
import { AdminAuditLogService } from 'src/admin-audit-log/admin-audit-log.service';
import { retentionDeadline } from 'src/common/utils/retention.util';

/** 관리자 수동 지급용 시스템 상품 (판매 목록에는 노출되지 않음) */
const ADMIN_GRANT_PRODUCT_TYPE = 'admin_grant';

@Injectable()
export class AdminCoinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coinBalanceService: CoinBalanceService,
    private readonly coinUsageService: CoinUsageService,
    private readonly userService: UserService,
    private readonly auditLogService: AdminAuditLogService,
  ) {}

  /**
   * 유저별 코인 잔액 목록 (검색 + 페이징)
   */
  async findBalances(options: {
    search?: string;
    limit: number;
    offset: number;
  }) {
    const where = options.search
      ? {
          user: {
            OR: [
              {
                user_id: {
                  contains: options.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                nickname: {
                  contains: options.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          },
        }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.coinBalance.findMany({
        where,
        include: {
          user: { select: { idx: true, user_id: true, nickname: true } },
        },
        orderBy: { updated_at: 'desc' },
        take: options.limit,
        skip: options.offset,
      }),
      this.prisma.coinBalance.count({ where }),
    ]);
    return { items, total };
  }

  /**
   * 유저의 충전/사용 이력
   */
  async findHistory(userIdx: number, limit: number) {
    const user = await this.userService.findByUserIdx(userIdx);
    if (!user) {
      throw new NotFoundException('회원을 찾을 수 없습니다.');
    }

    const [topups, usages, balance] = await Promise.all([
      this.prisma.coinTopup.findMany({
        where: { user_idx: userIdx },
        orderBy: { topped_up_at: 'desc' },
        take: limit,
        select: {
          id: true,
          product_name: true,
          total_coins: true,
          remaining_coins: true,
          paid_amount: true,
          status: true,
          topped_up_at: true,
        },
      }),
      this.prisma.coinUsage.findMany({
        where: { topup: { user_idx: userIdx } },
        orderBy: { used_at: 'desc' },
        take: limit,
        include: {
          donation: {
            select: {
              id: true,
              coin_amount: true,
              streamer_snapshot: true,
              donated_at: true,
            },
          },
        },
      }),
      this.prisma.coinBalance.findUnique({ where: { user_idx: userIdx } }),
    ]);

    return { balance, topups, usages };
  }

  /**
   * 코인 수동 지급 — 시스템 상품으로 CoinTopup을 생성해
   * 이후 후원(FIFO 사용)과 정합성을 유지한다. 사유 필수 + 감사 로그.
   */
  async grantCoins(
    adminIdx: number,
    userIdx: number,
    amount: number,
    reason: string,
    idempotencyKey?: string,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('지급 코인은 0보다 커야 합니다.');
    }
    const user = await this.userService.findByUserIdx(userIdx);
    if (!user) {
      throw new NotFoundException('회원을 찾을 수 없습니다.');
    }

    if (idempotencyKey) {
      const existing = await this.auditLogService.findByIdempotencyKey(
        'COIN_GRANT',
        idempotencyKey,
      );
      if (existing) {
        return { already_processed: true, audit_log_id: existing.id };
      }
    }

    const product = await this.ensureGrantProduct();

    const topup = await this.prisma.$transaction(async (tx) => {
      const created = await tx.coinTopup.create({
        data: {
          user_idx: userIdx,
          product_id: product.id,
          product_name: product.name,
          base_coins: amount,
          bonus_coins: 0,
          total_coins: amount,
          remaining_coins: amount,
          paid_amount: 0,
          coin_unit_price: 0,
          status: TopupStatus.COMPLETED,
          user_snapshot: {
            user_idx: user.idx,
            user_id: user.user_id,
            nickname: user.nickname,
          },
          should_delete_at: retentionDeadline(),
        },
      });
      await this.coinBalanceService.addCoinsFromTopup(userIdx, amount, tx);
      await this.auditLogService.record(
        {
          adminIdx,
          action: 'COIN_GRANT',
          targetType: 'USER',
          targetId: userIdx,
          reason,
          detail: {
            amount,
            topup_id: created.id,
            ...(idempotencyKey && { idempotency_key: idempotencyKey }),
          },
        },
        tx,
      );
      return created;
    });

    return { topup_id: topup.id, amount };
  }

  /**
   * 코인 수동 회수 — 기존 코인 사용 플로우(FIFO)로 차감. 사유 필수 + 감사 로그.
   */
  async revokeCoins(
    adminIdx: number,
    userIdx: number,
    amount: number,
    reason: string,
    idempotencyKey?: string,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('회수 코인은 0보다 커야 합니다.');
    }
    const user = await this.userService.findByUserIdx(userIdx);
    if (!user) {
      throw new NotFoundException('회원을 찾을 수 없습니다.');
    }

    if (idempotencyKey) {
      const existing = await this.auditLogService.findByIdempotencyKey(
        'COIN_REVOKE',
        idempotencyKey,
      );
      if (existing) {
        return { already_processed: true, audit_log_id: existing.id };
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await this.coinUsageService.useCoins(userIdx, { amount }, tx);
      await this.auditLogService.record(
        {
          adminIdx,
          action: 'COIN_REVOKE',
          targetType: 'USER',
          targetId: userIdx,
          reason,
          detail: {
            amount,
            ...(idempotencyKey && { idempotency_key: idempotencyKey }),
          },
        },
        tx,
      );
    });

    return { amount };
  }

  /**
   * 관리자 지급용 시스템 상품 확보 (없으면 생성, 비활성으로 판매 목록 제외)
   */
  private async ensureGrantProduct() {
    const existing = await this.prisma.product.findFirst({
      where: { product_type: ADMIN_GRANT_PRODUCT_TYPE },
    });
    if (existing) return existing;

    return await this.prisma.product.create({
      data: {
        name: '관리자 지급',
        description: '관리자 수동 코인 지급 (판매 상품 아님)',
        base_coins: 0,
        bonus_coins: 0,
        total_coins: 0,
        base_price: 0,
        price: 0,
        product_type: ADMIN_GRANT_PRODUCT_TYPE,
        is_active: false,
        sort_order: 9999,
      },
    });
  }
}
