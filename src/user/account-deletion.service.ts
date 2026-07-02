import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserRepository } from 'src/user/user.repository';
import { IvsService } from 'src/ivs/ivs.service';
import { NcpChannelService } from 'src/ncp-live-station/services/ncp-channel.service';
import { AwsService } from 'src/aws/aws.service';
import { RedisService } from 'src/redis/redis.service';
import { DeleteAccountDto } from './dto/delete-account.dto';

@Injectable()
export class AccountDeletionService {
  private readonly logger = new Logger(AccountDeletionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepository: UserRepository,
    private readonly ivsService: IvsService,
    private readonly ncpChannelService: NcpChannelService,
    private readonly awsService: AwsService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 회원 탈퇴 처리
   * 1) 본인 재확인 → 2) 차단 조건 검사 →
   * 3) User 삭제(cascade 즉시 파기) → 4) 외부 자원 정리(best-effort)
   * 거래 스냅샷(5년 보존)은 거래 생성 시점에 이미 기록되어 있다
   * — docs/plan_snapshot_at_transaction.md 참조
   * @param user_idx 탈퇴할 사용자 idx
   * @param dto 본인 재확인 정보
   */
  async deleteAccount(user_idx: number, dto: DeleteAccountDto): Promise<void> {
    const user = await this.userRepository.getUserWithRelations(user_idx, {
      ivs_channel: true,
      ncp_channel: true,
    });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    await this.verifyIdentity(user, dto);

    // 외부 자원 정리용 정보는 User 삭제 전에 확보
    const ivsArn = user.ivs?.arn;
    const ncpChannelId = user.ncpChannel?.channel_id;
    const profileImg = user.profile_img;

    await this.prisma.$transaction(async (tx) => {
      await this.assertDeletable(user_idx, tx);

      // User 삭제 → cascade 즉시 파기(위젯 포함) + 거래 레코드 user_idx SetNull
      await this.userRepository.deleteUser(user_idx, tx);
    });

    this.logger.log(
      `회원 탈퇴 완료: user_idx=${user_idx}, user_id=${user.user_id}`,
    );

    await this.cleanupExternal(user.user_id, ivsArn, ncpChannelId, profileImg);
  }

  /**
   * 본인 재확인 — 일반 계정은 비밀번호, OAuth 계정은 confirm 플래그
   */
  private async verifyIdentity(user: User, dto: DeleteAccountDto) {
    if (user.password) {
      if (
        !dto.password ||
        !(await bcrypt.compare(dto.password, user.password))
      ) {
        throw new BadRequestException('비밀번호가 일치하지 않습니다.');
      }
      return;
    }
    if (dto.confirm !== true) {
      throw new BadRequestException('탈퇴 확인(confirm)이 필요합니다.');
    }
  }

  /**
   * 탈퇴 차단 조건 검사 — 환불·정산 분쟁 예방 목적
   */
  private async assertDeletable(
    user_idx: number,
    tx: Prisma.TransactionClient,
  ) {
    // 1) 방송 중
    const stream = await tx.stream.findUnique({
      where: { broadcaster_idx: user_idx },
    });
    if (stream) {
      throw new BadRequestException('방송 종료 후 탈퇴할 수 있습니다.');
    }

    // 2) 진행 중 결제
    const pendingPayment = await tx.paymentTransaction.findFirst({
      where: { user_idx, status: { in: ['PENDING', 'WAITING_DEPOSIT'] } },
    });
    if (pendingPayment) {
      throw new BadRequestException(
        '진행 중인 결제를 완료하거나 취소한 후 탈퇴할 수 있습니다.',
      );
    }

    // 3) 잔여 코인
    const balance = await tx.coinBalance.findUnique({ where: { user_idx } });
    if (balance && balance.coin_balance > 0) {
      throw new BadRequestException(
        '잔여 코인을 환불받거나 사용한 후 탈퇴할 수 있습니다.',
      );
    }

    // 4) 미정산 수익
    const unsettledPayout = await tx.payoutCoin.findFirst({
      where: {
        streamer_idx: user_idx,
        status: { in: ['WAITING', 'AVAILABLE', 'BLOCKED', 'IN_SETTLEMENT'] },
      },
    });
    if (unsettledPayout) {
      throw new BadRequestException(
        '미정산 수익이 있습니다. 정산 완료 후 탈퇴할 수 있습니다.',
      );
    }
    const pendingSettlement = await tx.settlement.findFirst({
      where: {
        streamer_idx: user_idx,
        status: { in: ['PENDING', 'APPROVED'] },
      },
    });
    if (pendingSettlement) {
      throw new BadRequestException(
        '처리 중인 정산이 있습니다. 정산 완료 후 탈퇴할 수 있습니다.',
      );
    }
  }

  /**
   * 외부 자원 정리 (best-effort) — 실패해도 탈퇴는 이미 완료된 상태이므로 로그만 남긴다.
   * IVS 삭제 실패분은 syncAndDeleteOrphanedChannels가 회수한다.
   * NCP 채널 삭제 실패분은 NCP의 30일 미사용 자동 회수로 정리된다.
   */
  private async cleanupExternal(
    user_id: string,
    ivsArn?: string,
    ncpChannelId?: string,
    profileImg?: string,
  ) {
    if (ivsArn) {
      await this.ivsService
        .deleteChannel(ivsArn)
        .catch((e) =>
          this.logger.error(`IVS 채널 삭제 실패 (arn=${ivsArn}): ${e}`),
        );
    }
    if (ncpChannelId) {
      await this.ncpChannelService
        .deleteChannel(ncpChannelId)
        .catch((e) =>
          this.logger.error(
            `NCP 채널 삭제 실패 (channelId=${ncpChannelId}): ${e}`,
          ),
        );
    }
    if (profileImg) {
      const key = profileImg.replace(`${process.env.CDN_URL}/`, '');
      if (key.startsWith('profile/')) {
        await this.awsService
          .deleteFromS3(key)
          .catch((e) =>
            this.logger.error(`프로필 이미지 삭제 실패 (key=${key}): ${e}`),
          );
      }
    }
    await this.redisService
      .deleteMultipleKeys([`viewer:${user_id}`])
      .catch((e) => this.logger.error(`Redis 키 삭제 실패: ${e}`));
  }
}
