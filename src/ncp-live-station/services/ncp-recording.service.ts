import { Injectable } from '@nestjs/common';
import { NcpApiClient, NcpQuery } from '../ncp-api.client';

/** Live Station 녹화 (A-2) */
@Injectable()
export class NcpRecordingService {
  constructor(private readonly client: NcpApiClient) {}

  /** 녹화 시작 — PUT /api/v2/channels/{id}/startRecord */
  startRecording<T = unknown>(
    channelId: string,
    body?: Record<string, unknown>,
  ) {
    return this.client.request<T>(
      'PUT',
      `/api/v2/channels/${channelId}/startRecord`,
      { body },
    );
  }

  /** 녹화 종료 — PUT /api/v2/channels/{id}/stopRecord */
  stopRecording<T = unknown>(channelId: string) {
    return this.client.request<T>(
      'PUT',
      `/api/v2/channels/${channelId}/stopRecord`,
    );
  }

  /** 녹화 파일 업로드 — POST /api/v2/buckets/{bucketName}/upload */
  uploadRecording<T = unknown>(
    bucketName: string,
    body: Record<string, unknown>,
  ) {
    return this.client.request<T>(
      'POST',
      `/api/v2/buckets/${bucketName}/upload`,
      { body },
    );
  }

  /** 녹화 파일 목록 — GET /api/v2/channels/{id}/records */
  listRecordings<T = unknown>(channelId: string, query?: NcpQuery) {
    return this.client.request<T>(
      'GET',
      `/api/v2/channels/${channelId}/records`,
      { query },
    );
  }

  /** 녹화 파일 조회 — GET /api/v2/channels/{id}/records/{recordId} */
  getRecording<T = unknown>(channelId: string, recordId: string) {
    return this.client.request<T>(
      'GET',
      `/api/v2/channels/${channelId}/records/${recordId}`,
    );
  }

  /** 녹화 파일 삭제 — DELETE /api/v2/channels/{id}/records */
  deleteRecording<T = unknown>(
    channelId: string,
    body?: Record<string, unknown>,
  ) {
    return this.client.request<T>(
      'DELETE',
      `/api/v2/channels/${channelId}/records`,
      { body },
    );
  }
}
