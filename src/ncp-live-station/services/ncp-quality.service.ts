import { Injectable } from '@nestjs/common';
import { NcpApiClient } from '../ncp-api.client';

/** Live Station 화질 / 화질 설정 (A-5) */
@Injectable()
export class NcpQualityService {
  constructor(private readonly client: NcpApiClient) {}

  // --- Quality Profile ---

  /** 화질 목록 — GET /api/v2/qualityProfiles */
  listProfiles<T = unknown>() {
    return this.client.request<T>('GET', '/api/v2/qualityProfiles');
  }

  /** 화질 조회 — GET /api/v2/qualityProfiles/{qualityId} */
  getProfile<T = unknown>(qualityId: string | number) {
    return this.client.request<T>(
      'GET',
      `/api/v2/qualityProfiles/${qualityId}`,
    );
  }

  /** Custom 화질 생성 — POST /api/v2/qualityProfiles */
  createProfile<T = unknown>(body: Record<string, unknown>) {
    return this.client.request<T>('POST', '/api/v2/qualityProfiles', { body });
  }

  /** Custom 화질 삭제 — DELETE /api/v2/qualityProfiles/{qualityId} */
  deleteProfile<T = unknown>(qualityId: string | number) {
    return this.client.request<T>(
      'DELETE',
      `/api/v2/qualityProfiles/${qualityId}`,
    );
  }

  // --- Quality Setting (Quality Set) ---

  /** 화질 설정 목록 — GET /api/v2/qualitySets */
  listSets<T = unknown>() {
    return this.client.request<T>('GET', '/api/v2/qualitySets');
  }

  /** 화질 설정 조회 — GET /api/v2/qualitySets/{qualitySetId} */
  getSet<T = unknown>(qualitySetId: string | number) {
    return this.client.request<T>('GET', `/api/v2/qualitySets/${qualitySetId}`);
  }

  /** Custom 화질 설정 생성 — POST /api/v2/qualitySets */
  createSet<T = unknown>(body: Record<string, unknown>) {
    return this.client.request<T>('POST', '/api/v2/qualitySets', { body });
  }

  /** Custom 화질 설정 수정 — PUT /api/v2/qualitySets/{qualitySetId} */
  updateSet<T = unknown>(
    qualitySetId: string | number,
    body: Record<string, unknown>,
  ) {
    return this.client.request<T>(
      'PUT',
      `/api/v2/qualitySets/${qualitySetId}`,
      { body },
    );
  }

  /** Custom 화질 설정 삭제 — DELETE /api/v2/qualitySets/{qualitySetId} */
  deleteSet<T = unknown>(qualitySetId: string | number) {
    return this.client.request<T>(
      'DELETE',
      `/api/v2/qualitySets/${qualitySetId}`,
    );
  }
}
