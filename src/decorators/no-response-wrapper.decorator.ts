import { SetMetadata } from '@nestjs/common';

/**
 * 응답 자동 래핑을 건너뛰기 위한 데코레이터
 *
 * 사용 케이스:
 * - 파일 다운로드
 * - 스트리밍 응답
 * - 서드파티 API 프록시
 * - 헬스체크 엔드포인트
 *
 * @example
 * @Get('download')
 * @NoResponseWrapper()
 * async downloadFile() {
 *   return createReadStream('file.pdf');
 * }
 */
export const NoResponseWrapper = () => SetMetadata('noResponseWrapper', true);
