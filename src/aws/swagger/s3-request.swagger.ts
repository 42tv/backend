import { ApiProperty } from '@nestjs/swagger';

/**
 * Swagger용 S3 파일 업로드 엔티티
 * API 문서화를 위한 파일 업로드 요청 스키마입니다.
 */
export class S3UploadSwagger {
  @ApiProperty({ 
    description: 'S3에 저장될 파일의 키(경로)', 
    example: 'profile/user123/avatar.jpg',
    required: true 
  })
  key: string;

  @ApiProperty({ 
    description: '업로드할 파일', 
    type: 'string',
    format: 'binary',
    required: true 
  })
  file: any;

  @ApiProperty({ 
    description: '파일의 MIME 타입', 
    example: 'image/jpeg',
    required: false 
  })
  mimetype?: string;
}

/**
 * Swagger용 S3 파일 삭제 엔티티
 * API 문서화를 위한 파일 삭제 요청 스키마입니다.
 */
export class S3DeleteSwagger {
  @ApiProperty({ 
    description: 'S3에서 삭제할 파일의 키(경로)', 
    example: 'profile/user123/old-avatar.jpg',
    required: true 
  })
  key: string;
}
