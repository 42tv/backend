/**
 * 표준 성공 응답 DTO
 */
export class SuccessResponseDto<T> {
  success: true;
  data: T;
  message?: string;
  pagination?: PaginationMetaDto;
}

/**
 * 페이지네이션 메타데이터 DTO
 */
export class PaginationMetaDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
