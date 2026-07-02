import { Injectable } from '@nestjs/common';
import { NcpApiClient, NcpQuery } from '../ncp-api.client';

/** Live Station 동시 송출 Re-Stream (A-6) */
@Injectable()
export class NcpRestreamService {
  constructor(private readonly client: NcpApiClient) {}

  /** 리스트림 채널 생성 — POST /api/v2/re-stream/channels */
  createChannel<T = unknown>(body: Record<string, unknown>) {
    return this.client.request<T>('POST', '/api/v2/re-stream/channels', {
      body,
    });
  }

  /** 동시 송출 플랫폼 목록 — GET /api/v2/re-stream/channels/{id}/platforms */
  listPlatforms<T = unknown>(channelId: string) {
    return this.client.request<T>(
      'GET',
      `/api/v2/re-stream/channels/${channelId}/platforms`,
    );
  }

  /** 리스트림 채널 목록 — GET /api/v2/re-stream/channels */
  listChannels<T = unknown>(query?: NcpQuery) {
    return this.client.request<T>('GET', '/api/v2/re-stream/channels', {
      query,
    });
  }

  /** 리스트림 채널 조회 — GET /api/v2/re-stream/channels/{id} */
  getChannel<T = unknown>(channelId: string) {
    return this.client.request<T>(
      'GET',
      `/api/v2/re-stream/channels/${channelId}`,
    );
  }

  /** 플랫폼 수정 — PUT /api/v2/re-stream/channels/{id}/platforms/{platformId} */
  updatePlatform<T = unknown>(
    channelId: string,
    platformId: string,
    body: Record<string, unknown>,
  ) {
    return this.client.request<T>(
      'PUT',
      `/api/v2/re-stream/channels/${channelId}/platforms/${platformId}`,
      { body },
    );
  }

  /** 리스트림 채널 반납 — DELETE /api/v2/re-stream/channels/{id} */
  deleteChannel<T = unknown>(channelId: string) {
    return this.client.request<T>(
      'DELETE',
      `/api/v2/re-stream/channels/${channelId}`,
    );
  }
}
