import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export interface NcpChannelData {
  channel_id: string;
  stream_key: string;
  publish_url: string;
  playback_url: string;
  thumbnail_url?: string | null;
  channel_status?: string | null;
  name: string;
}

/** ncp_channels 테이블 접근 */
@Injectable()
export class NcpChannelRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserIdx(user_idx: number) {
    return this.prisma.ncpChannel.findUnique({ where: { user_idx } });
  }

  findByChannelId(channel_id: string) {
    return this.prisma.ncpChannel.findUnique({ where: { channel_id } });
  }

  /** 채널명 생성을 위한 유저의 로그인 user_id 조회 */
  async findUserId(user_idx: number): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { idx: user_idx },
      select: { user_id: true },
    });
    return user?.user_id ?? null;
  }

  /** user_idx 기준 upsert (1유저 1채널) */
  upsert(user_idx: number, data: NcpChannelData) {
    return this.prisma.ncpChannel.upsert({
      where: { user_idx },
      create: { user_idx, ...data },
      update: data,
    });
  }

  deleteByUserIdx(user_idx: number) {
    return this.prisma.ncpChannel.delete({ where: { user_idx } });
  }
}
