import {
  SuccessResponseDto,
  PaginationMetaDto,
} from '../dto/success-response.dto';

/**
 * 성공 응답 래퍼 유틸리티
 */
export class ResponseWrapper {
  /**
   * 성공 응답 생성 (단일 엔트리 포인트)
   *
   * @param data 응답 데이터 (없으면 null)
   * @param message 사용자 피드백 메시지
   * @param pagination 페이지네이션 정보
   */
  static success<T>(
    data: T | null,
    message?: string,
    pagination?: PaginationMetaDto,
  ): SuccessResponseDto<T> {
    return {
      success: true,
      data,
      message,
      ...(pagination ? { pagination } : {}),
    };
  }
}
