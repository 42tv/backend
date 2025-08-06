import { ApiProperty } from '@nestjs/swagger';

/**
 * Swagger용 프로필 이미지 업로드 요청 스키마
 * API 문서화를 위한 multipart/form-data 업로드 스키마입니다.
 * AWS S3로 파일이 업로드됩니다.
 */
export class ProfileImageUploadDto {
  @ApiProperty({ 
    description: '프로필 이미지 파일 (5MB 이하, AWS S3에 저장)', 
    type: 'string',
    format: 'binary',
    required: true 
  })
  image: any;
}
