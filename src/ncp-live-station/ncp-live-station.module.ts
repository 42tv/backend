import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RealtimeRedisModule } from 'src/redis/redis.module';
import { NcpApiClient } from './ncp-api.client';
import { NcpChannelRepository } from './ncp-channel.repository';
import { NcpLiveStationController } from './ncp-live-station.controller';
import { NcpChannelService } from './services/ncp-channel.service';
import { NcpChannelLifecycleService } from './services/ncp-channel-lifecycle.service';
import { NcpRecordingService } from './services/ncp-recording.service';
import { NcpShortClipService } from './services/ncp-shortclip.service';
import { NcpCurtainService } from './services/ncp-curtain.service';
import { NcpQualityService } from './services/ncp-quality.service';
import { NcpRestreamService } from './services/ncp-restream.service';
import { NcpVod2liveService } from './services/ncp-vod2live.service';
import { NcpEventService } from './services/ncp-event.service';

/**
 * NCP Live Station API 모듈.
 * - 기능군별 service(채널/녹화/숏클립/커튼/화질/동시송출/VOD2LIVE/이벤트): API 호출
 * - NcpChannelLifecycleService: 1유저 1채널 수명 관리(30일 회수 대응, ensureChannel)
 */
@Module({
  imports: [ConfigModule, PrismaModule, RealtimeRedisModule],
  controllers: [NcpLiveStationController],
  providers: [
    NcpApiClient,
    NcpChannelRepository,
    NcpChannelService,
    NcpChannelLifecycleService,
    NcpRecordingService,
    NcpShortClipService,
    NcpCurtainService,
    NcpQualityService,
    NcpRestreamService,
    NcpVod2liveService,
    NcpEventService,
  ],
  exports: [
    NcpChannelService,
    NcpChannelLifecycleService,
    NcpRecordingService,
    NcpShortClipService,
    NcpCurtainService,
    NcpQualityService,
    NcpRestreamService,
    NcpVod2liveService,
    NcpEventService,
  ],
})
export class NcpLiveStationModule {}
