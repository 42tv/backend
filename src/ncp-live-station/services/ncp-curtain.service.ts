import { Injectable } from '@nestjs/common';
import { NcpApiClient, NcpQuery } from '../ncp-api.client';

/** Live Station 라이브 커튼 (A-4) */
@Injectable()
export class NcpCurtainService {
  constructor(private readonly client: NcpApiClient) {}

  /** 커튼 콘텐츠 생성 — POST /api/v2/curtainContents */
  createContent<T = unknown>(body: Record<string, unknown>) {
    return this.client.request<T>('POST', '/api/v2/curtainContents', { body });
  }

  /** 커튼 콘텐츠 목록 — GET /api/v2/curtainContents */
  listContents<T = unknown>(query?: NcpQuery) {
    return this.client.request<T>('GET', '/api/v2/curtainContents', { query });
  }

  /** 커튼 콘텐츠 조회 — GET /api/v2/curtainContents/{contentId} */
  getContent<T = unknown>(contentId: string) {
    return this.client.request<T>(
      'GET',
      `/api/v2/curtainContents/${contentId}`,
    );
  }

  /** 커튼 콘텐츠 삭제 — DELETE /api/v2/curtainContents/{contentId} */
  deleteContent<T = unknown>(contentId: string) {
    return this.client.request<T>(
      'DELETE',
      `/api/v2/curtainContents/${contentId}`,
    );
  }

  /** 커튼 시작 — POST /api/v2/channels/{id}/curtain/insert */
  startCurtain<T = unknown>(channelId: string, body?: Record<string, unknown>) {
    return this.client.request<T>(
      'POST',
      `/api/v2/channels/${channelId}/curtain/insert`,
      { body },
    );
  }

  /** 커튼 종료 — POST /api/v2/channels/{id}/curtain/remove */
  stopCurtain<T = unknown>(channelId: string) {
    return this.client.request<T>(
      'POST',
      `/api/v2/channels/${channelId}/curtain/remove`,
    );
  }
}
