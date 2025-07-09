import { ApiProperty } from '@nestjs/swagger';

/**
 * 매니저 추가 성공 응답 DTO
 */
export class AddManagerResponseDto {
  @ApiProperty({ 
    description: '매니저 추가 성공 메시지', 
    example: '매니저가 성공적으로 추가되었습니다.' 
  })
  message: string;

  @ApiProperty({ 
    description: '추가된 매니저 ID', 
    example: 'manager123' 
  })
  managerId: string;
}

/**
 * 매니저 제거 성공 응답 DTO
 */
export class RemoveManagerResponseDto {
  @ApiProperty({ 
    description: '매니저 제거 성공 메시지', 
    example: '매니저가 성공적으로 제거되었습니다.' 
  })
  message: string;

  @ApiProperty({ 
    description: '제거된 매니저 ID', 
    example: 'manager123' 
  })
  managerId: string;
}

/**
 * 매니저 에러 응답 DTO
 */
export class ManagerErrorResponseDto {
  @ApiProperty({ 
    description: 'HTTP 상태 코드', 
    example: 400 
  })
  statusCode: number;

  @ApiProperty({ 
    description: '에러 메시지', 
    examples: [
      '존재하지 않는 사용자입니다.',
      '이미 매니저로 등록된 사용자입니다.',
      '매니저가 아닌 사용자입니다.',
      '자기 자신을 매니저로 추가할 수 없습니다.',
      '사용자 ID는 4-20자여야 합니다.'
    ]
  })
  message: string;

  @ApiProperty({ 
    description: '에러 타입', 
    example: 'Bad Request' 
  })
  error: string;
}

/**
 * 인증 에러 응답 DTO
 */
export class ManagerUnauthorizedResponseDto {
  @ApiProperty({ 
    description: 'HTTP 상태 코드', 
    example: 401 
  })
  statusCode: number;

  @ApiProperty({ 
    description: '에러 메시지', 
    example: 'Unauthorized' 
  })
  message: string;
}
