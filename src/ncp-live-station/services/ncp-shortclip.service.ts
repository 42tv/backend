import { Injectable } from '@nestjs/common';
import { NcpApiClient } from '../ncp-api.client';

/** Live Station 숏클립 / 스냅샷 (A-3) */
@Injectable()
export class NcpShortClipService {
  constructor(private readonly client: NcpApiClient) {}

  /** 스냅샷 생성 — POST /api/v2/channels/{id}/snapshot */
  createSnapshot<T = unknown>(
    channelId: string,
    body?: Record<string, unknown>,
  ) {
    return this.client.request<T>(
      'POST',
      `/api/v2/channels/${channelId}/snapshot`,
      { body },
    );
  }

  /** 스냅샷 조회 — GET /api/v2/channels/{id}/snapshot/{snapshotId} */
  getSnapshot<T = unknown>(channelId: string, snapshotId: string) {
    return this.client.request<T>(
      'GET',
      `/api/v2/channels/${channelId}/snapshot/${snapshotId}`,
    );
  }

  /** 숏클립 생성 — POST /api/v2/channels/{id}/{snapshotId} */
  createShortClip<T = unknown>(
    channelId: string,
    snapshotId: string,
    body?: Record<string, unknown>,
  ) {
    return this.client.request<T>(
      'POST',
      `/api/v2/channels/${channelId}/${snapshotId}`,
      { body },
    );
  }

  /** 숏클립 목록 — GET /api/v2/channels/{id}/{snapshotId}/shortclips */
  listShortClips<T = unknown>(channelId: string, snapshotId: string) {
    return this.client.request<T>(
      'GET',
      `/api/v2/channels/${channelId}/${snapshotId}/shortclips`,
    );
  }

  /** 숏클립 조회 — GET /api/v2/channels/{id}/shortclip/{shortClipId} */
  getShortClip<T = unknown>(channelId: string, shortClipId: string) {
    return this.client.request<T>(
      'GET',
      `/api/v2/channels/${channelId}/shortclip/${shortClipId}`,
    );
  }
}
