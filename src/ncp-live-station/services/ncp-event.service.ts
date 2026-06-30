import { Injectable } from '@nestjs/common';
import { NcpApiClient, NcpQuery } from '../ncp-api.client';
import { RegisterCallbackBody } from '../ncp-live-station.types';

/** Live Station 이벤트 / 콜백 / 알림 (A-8) */
@Injectable()
export class NcpEventService {
  constructor(private readonly client: NcpApiClient) {}

  // --- Manager / Notification (SMS·이메일) ---

  /** 관리자 그룹 목록 — GET /api/v2/notification/manager-groups */
  listManagerGroups<T = unknown>() {
    return this.client.request<T>('GET', '/api/v2/notification/manager-groups');
  }

  /** 관리자 조회 — GET /api/v2/notification/manager-groups/{managerGroupNo} */
  getManagerGroup<T = unknown>(managerGroupNo: string | number) {
    return this.client.request<T>(
      'GET',
      `/api/v2/notification/manager-groups/${managerGroupNo}`,
    );
  }

  /** 이벤트 알람 설정(SMS/이메일) — POST /api/v2/notification/{id}/for-general-channel */
  setNotification<T = unknown>(
    channelId: string,
    body: Record<string, unknown>,
  ) {
    return this.client.request<T>(
      'POST',
      `/api/v2/notification/${channelId}/for-general-channel`,
      { body },
    );
  }

  // --- Event 조회 ---

  /** 전체 이벤트 목록 — GET /api/v2/events */
  listEvents<T = unknown>(query?: NcpQuery) {
    return this.client.request<T>('GET', '/api/v2/events', { query });
  }

  /** Live 채널 송출 이벤트 — GET /api/v2/channels/{id}/publish-log */
  listLivePublishEvents<T = unknown>(channelId: string, query?: NcpQuery) {
    return this.client.request<T>(
      'GET',
      `/api/v2/channels/${channelId}/publish-log`,
      { query },
    );
  }

  /** Live 채널 이벤트 — GET /api/v2/channels/{id}/events */
  listLiveEvents<T = unknown>(channelId: string, query?: NcpQuery) {
    return this.client.request<T>(
      'GET',
      `/api/v2/channels/${channelId}/events`,
      { query },
    );
  }

  /** Re-Stream 채널 송출 이벤트 — GET /api/v2/re-stream/channels/{id}/publish-log */
  listRestreamPublishEvents<T = unknown>(channelId: string, query?: NcpQuery) {
    return this.client.request<T>(
      'GET',
      `/api/v2/re-stream/channels/${channelId}/publish-log`,
      { query },
    );
  }

  /** Re-Stream 채널 이벤트 — GET /api/v2/re-stream/channels/{id}/events */
  listRestreamEvents<T = unknown>(channelId: string, query?: NcpQuery) {
    return this.client.request<T>(
      'GET',
      `/api/v2/re-stream/channels/${channelId}/events`,
      { query },
    );
  }

  // --- Callback (HTTP 웹훅) 등록/조회 ---

  /** 기본 콜백 등록(전 채널) — POST /api/v2/events/callbackEndpoint */
  registerCallback<T = unknown>(body: RegisterCallbackBody) {
    return this.client.request<T>('POST', '/api/v2/events/callbackEndpoint', {
      body,
    });
  }

  /** Live 채널 콜백 등록 — POST /api/v2/channels/{id}/callbackEndpoint */
  registerLiveCallback<T = unknown>(
    channelId: string,
    body: RegisterCallbackBody,
  ) {
    return this.client.request<T>(
      'POST',
      `/api/v2/channels/${channelId}/callbackEndpoint`,
      { body },
    );
  }

  /** Re-Stream 채널 콜백 등록 — POST /api/v2/re-stream/channels/{id}/callbackEndpoint */
  registerRestreamCallback<T = unknown>(
    channelId: string,
    body: RegisterCallbackBody,
  ) {
    return this.client.request<T>(
      'POST',
      `/api/v2/re-stream/channels/${channelId}/callbackEndpoint`,
      { body },
    );
  }

  /** VOD2LIVE 채널 콜백 등록 — POST /api/v2/vod/channels/{id}/callbackEndpoint */
  registerVod2liveCallback<T = unknown>(
    channelId: string,
    body: RegisterCallbackBody,
  ) {
    return this.client.request<T>(
      'POST',
      `/api/v2/vod/channels/${channelId}/callbackEndpoint`,
      { body },
    );
  }

  /** 등록된 콜백 조회 — GET /api/v2/events/callbackEndpoint */
  getCallback<T = unknown>() {
    return this.client.request<T>('GET', '/api/v2/events/callbackEndpoint');
  }
}
