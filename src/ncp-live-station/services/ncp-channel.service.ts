import { Injectable } from '@nestjs/common';
import { NcpApiClient, NcpQuery } from '../ncp-api.client';
import {
  ChannelInfo,
  CreateChannelBody,
  NcpListResponse,
  NcpResponse,
  ServiceUrl,
  ServiceUrlType,
} from '../ncp-live-station.types';

/** Live Station 채널 (A-1) */
@Injectable()
export class NcpChannelService {
  constructor(private readonly client: NcpApiClient) {}

  /** 채널 생성 — POST /api/v2/channels */
  createChannel(body: CreateChannelBody) {
    return this.client.request<NcpResponse<{ channelId: string }>>(
      'POST',
      '/api/v2/channels',
      { body },
    );
  }

  /** 채널 목록 — GET /api/v2/channels */
  listChannels<T = unknown>(query?: NcpQuery) {
    return this.client.request<T>('GET', '/api/v2/channels', { query });
  }

  /** 스트림 메타데이터 — GET /api/v2/channels/{id}/streamMetadata */
  getStreamMetadata<T = unknown>(channelId: string) {
    return this.client.request<T>(
      'GET',
      `/api/v2/channels/${channelId}/streamMetadata`,
    );
  }

  /** 채널 조회 (streamKey·publishUrl·channelStatus) — GET /api/v2/channels/{id} */
  getChannel(channelId: string) {
    return this.client.request<NcpResponse<ChannelInfo>>(
      'GET',
      `/api/v2/channels/${channelId}`,
    );
  }

  /** 서비스 URL(재생/타임머신/썸네일) — GET /api/v2/channels/{id}/serviceUrls */
  getServiceUrls(
    channelId: string,
    serviceUrlType: ServiceUrlType = 'GENERAL',
  ) {
    return this.client.request<NcpListResponse<ServiceUrl>>(
      'GET',
      `/api/v2/channels/${channelId}/serviceUrls`,
      { query: { serviceUrlType } },
    );
  }

  /** 채널 설정 변경 — PUT /api/v2/channels/{id} */
  updateChannel<T = unknown>(channelId: string, body: Record<string, unknown>) {
    return this.client.request<T>('PUT', `/api/v2/channels/${channelId}`, {
      body,
    });
  }

  /** 채널 정지 — PUT /api/v2/channels/{id}/off */
  disableChannel<T = unknown>(channelId: string) {
    return this.client.request<T>('PUT', `/api/v2/channels/${channelId}/off`);
  }

  /** 채널 정지 해제 — PUT /api/v2/channels/{id}/on */
  enableChannel<T = unknown>(channelId: string) {
    return this.client.request<T>('PUT', `/api/v2/channels/${channelId}/on`);
  }

  /** 채널 반납(삭제) — DELETE /api/v2/channels/{id} */
  deleteChannel<T = unknown>(channelId: string) {
    return this.client.request<T>('DELETE', `/api/v2/channels/${channelId}`);
  }

  /** 메인↔백업 스트림 전환 — PUT /api/v2/channels/{id}/switch-stream */
  switchStream<T = unknown>(channelId: string) {
    return this.client.request<T>(
      'PUT',
      `/api/v2/channels/${channelId}/switch-stream`,
    );
  }
}
