import { Injectable } from '@nestjs/common';
import { NcpApiClient, NcpQuery } from '../ncp-api.client';

/** Live Station VOD2LIVE 채널 / 스케줄 (A-7) */
@Injectable()
export class NcpVod2liveService {
  constructor(private readonly client: NcpApiClient) {}

  // --- Channel ---

  /** 채널 생성 — POST /api/v2/vod/channels */
  createChannel<T = unknown>(body: Record<string, unknown>) {
    return this.client.request<T>('POST', '/api/v2/vod/channels', { body });
  }

  /** 채널 목록 — GET /api/v2/vod/channels */
  listChannels<T = unknown>(query?: NcpQuery) {
    return this.client.request<T>('GET', '/api/v2/vod/channels', { query });
  }

  /** 채널 조회 — GET /api/v2/vod/channels/{id} */
  getChannel<T = unknown>(channelId: string) {
    return this.client.request<T>('GET', `/api/v2/vod/channels/${channelId}`);
  }

  /** 서비스 URL — GET /api/v2/vod/channels/{id}/serviceUrls */
  getServiceUrls<T = unknown>(channelId: string, query?: NcpQuery) {
    return this.client.request<T>(
      'GET',
      `/api/v2/vod/channels/${channelId}/serviceUrls`,
      { query },
    );
  }

  /** 채널 설정 변경 — PUT /api/v2/vod/channels/{id} */
  updateChannel<T = unknown>(channelId: string, body: Record<string, unknown>) {
    return this.client.request<T>('PUT', `/api/v2/vod/channels/${channelId}`, {
      body,
    });
  }

  /** 채널 정지 — PUT /api/v2/vod/channels/{id}/off */
  disableChannel<T = unknown>(channelId: string) {
    return this.client.request<T>(
      'PUT',
      `/api/v2/vod/channels/${channelId}/off`,
    );
  }

  /** 채널 정지 해제 — PUT /api/v2/vod/channels/{id}/on */
  enableChannel<T = unknown>(channelId: string) {
    return this.client.request<T>(
      'PUT',
      `/api/v2/vod/channels/${channelId}/on`,
    );
  }

  /** 채널 CDN 변경 — POST /api/v2/vod/channels/{id}/cdnInfo */
  changeCdn<T = unknown>(channelId: string, body: Record<string, unknown>) {
    return this.client.request<T>(
      'POST',
      `/api/v2/vod/channels/${channelId}/cdnInfo`,
      { body },
    );
  }

  /** 채널 CDN 일괄 변경 — POST /api/v2/vod/channels/cdnInfo */
  bulkChangeCdn<T = unknown>(body: Record<string, unknown>) {
    return this.client.request<T>('POST', '/api/v2/vod/channels/cdnInfo', {
      body,
    });
  }

  /** 채널 반납 — DELETE /api/v2/vod/channels/{id} */
  deleteChannel<T = unknown>(channelId: string) {
    return this.client.request<T>(
      'DELETE',
      `/api/v2/vod/channels/${channelId}`,
    );
  }

  // --- Schedule ---

  /** 스케줄 생성 — POST /api/v2/vod/schedule */
  createSchedule<T = unknown>(body: Record<string, unknown>) {
    return this.client.request<T>('POST', '/api/v2/vod/schedule', { body });
  }

  /** 스케줄 조회 — GET /api/v2/vod/schedule/{scheduleId} */
  getSchedule<T = unknown>(scheduleId: string | number) {
    return this.client.request<T>('GET', `/api/v2/vod/schedule/${scheduleId}`);
  }

  /** 스케줄 수정 — PUT /api/v2/vod/schedule/{scheduleId} */
  updateSchedule<T = unknown>(
    scheduleId: string | number,
    body: Record<string, unknown>,
  ) {
    return this.client.request<T>('PUT', `/api/v2/vod/schedule/${scheduleId}`, {
      body,
    });
  }

  /** 스케줄 삭제 — DELETE /api/v2/vod/schedule/{scheduleId} */
  deleteSchedule<T = unknown>(scheduleId: string | number) {
    return this.client.request<T>(
      'DELETE',
      `/api/v2/vod/schedule/${scheduleId}`,
    );
  }
}
