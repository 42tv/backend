import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NcpApiClient } from './ncp-api.client';
import { NcpChannelService } from './services/ncp-channel.service';
import { NcpRecordingService } from './services/ncp-recording.service';
import { NcpShortClipService } from './services/ncp-shortclip.service';
import { NcpCurtainService } from './services/ncp-curtain.service';
import { NcpQualityService } from './services/ncp-quality.service';
import { NcpRestreamService } from './services/ncp-restream.service';
import { NcpVod2liveService } from './services/ncp-vod2live.service';
import { NcpEventService } from './services/ncp-event.service';

/**
 * NCP Live Station API 모듈.
 * 기능군별 service(채널/녹화/숏클립/커튼/화질/동시송출/VOD2LIVE/이벤트)를 export 하여
 * 다른 모듈에서 주입해 사용한다.
 */
@Module({
  imports: [ConfigModule],
  providers: [
    NcpApiClient,
    NcpChannelService,
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
