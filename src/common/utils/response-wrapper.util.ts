import {
  SuccessResponseDto,
  ResponseMetaDto,
  PaginationMetaDto,
} from '../dto/success-response.dto';

/**
 * 성공 응답 래퍼 유틸리티
 *
 * 컨트롤러에서 일관된 응답 형태를 생성하기 위해 사용
 */
export class ResponseWrapper {
  /**
   * 성공 응답 생성
   *
   * @param data 응답 데이터 (객체 형태로 전달, 키가 리소스 식별자 역할)
   * @param message 선택적 메시지
   * @param meta 선택적 메타데이터
   * @returns 표준화된 성공 응답
   *
   * @example
   * // 단일 리소스
   * return ResponseWrapper.success({ user: userData }, '사용자 정보를 조회했습니다.');
   *
   * @example
   * // 여러 리소스
   * return ResponseWrapper.success({
   *   channel: channelData,
   *   owner: ownerData,
   *   stats: statsData
   * }, '채널 정보를 조회했습니다.');
   *
   * @example
   * // 심플한 데이터
   * return ResponseWrapper.success({ tokens: { access_token, refresh_token } });
   */
  static success<T>(
    data: T,
    message?: string,
    meta?: Partial<ResponseMetaDto>,
  ): SuccessResponseDto<T> {
    return {
      success: true,
      data,
      message,
      meta: meta ? this.createMeta(meta) : undefined,
    };
  }

  /**
   * 빈 성공 응답 생성 (데이터 없음)
   *
   * @param message 메시지
   * @returns null 데이터를 가진 성공 응답
   *
   * @example
   * return ResponseWrapper.successEmpty('로그아웃이 완료되었습니다.');
   */
  static successEmpty(message: string): SuccessResponseDto<null> {
    return {
      success: true,
      data: null,
      message,
    };
  }

  /**
   * 페이지네이션을 포함한 리스트 응답 생성
   *
   * @param data 응답 데이터 (리스트를 포함한 객체)
   * @param pagination 페이지네이션 정보
   * @param message 선택적 메시지
   * @returns 페이지네이션 메타데이터를 포함한 성공 응답
   *
   * @example
   * return ResponseWrapper.successWithPagination(
   *   { posts: postsArray },
   *   { page: 1, limit: 20, total: 100, totalPages: 5 },
   *   '쪽지 목록을 조회했습니다.'
   * );
   */
  static successWithPagination<T>(
    data: T,
    pagination: PaginationMetaDto,
    message?: string,
  ): SuccessResponseDto<T> {
    return {
      success: true,
      data,
      message,
      meta: {
        ...this.createMeta(),
        pagination,
      },
    };
  }

  /**
   * 메타데이터 생성 (타임스탬프, 요청 ID)
   */
  private static createMeta(
    partial?: Partial<ResponseMetaDto>,
  ): ResponseMetaDto {
    return {
      timestamp: new Date().toISOString(),
      requestId: this.generateRequestId(),
      ...partial,
    };
  }

  /**
   * 고유 요청 ID 생성
   *
   * 형식: req-{timestamp}-{random}
   * 예시: req-1730812496789-abc123def
   */
  private static generateRequestId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `req-${timestamp}-${random}`;
  }
}
