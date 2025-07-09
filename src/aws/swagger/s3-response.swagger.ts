import { ApiProperty } from '@nestjs/swagger';

/**
 * Swagger용 S3 업로드 성공 응답 클래스
 * API 문서화를 위한 파일 업로드 성공 응답 스키마입니다.
 */
export class S3UploadResponseSwagger {
  @ApiProperty({ 
    description: '업로드 성공 여부', 
    example: true 
  })
  success: boolean;

  @ApiProperty({ 
    description: '업로드된 파일의 S3 키', 
    example: 'profile/user123/avatar.jpg' 
  })
  key: string;

  @ApiProperty({ 
    description: '업로드된 파일의 공개 URL', 
    example: 'https://your-bucket.s3.amazonaws.com/profile/user123/avatar.jpg',
    required: false 
  })
  url?: string;
}

/**
 * Swagger용 S3 삭제 성공 응답 클래스
 * API 문서화를 위한 파일 삭제 성공 응답 스키마입니다.
 */
export class S3DeleteResponseSwagger {
  @ApiProperty({ 
    description: '삭제 성공 여부', 
    example: true 
  })
  success: boolean;

  @ApiProperty({ 
    description: '삭제된 파일의 S3 키', 
    example: 'profile/user123/old-avatar.jpg' 
  })
  key: string;

  @ApiProperty({ 
    description: '삭제 성공 메시지', 
    example: 'File successfully deleted from S3' 
  })
  message: string;
}

/**
 * Swagger용 S3 오류 응답 클래스
 * API 문서화를 위한 S3 작업 실패 응답 스키마입니다.
 */
export class S3ErrorResponseSwagger {
  @ApiProperty({ 
    description: '에러 발생 여부', 
    example: true 
  })
  error: boolean;

  @ApiProperty({ 
    description: 'HTTP 상태 코드', 
    example: 500 
  })
  statusCode: number;

  @ApiProperty({ 
    description: '에러 메시지', 
    example: 'Failed to upload file to S3' 
  })
  message: string;

  @ApiProperty({ 
    description: '상세 에러 정보', 
    example: 'AccessDenied: Access Denied',
    required: false 
  })
  details?: string;
}
