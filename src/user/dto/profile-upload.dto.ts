import { ApiProperty } from '@nestjs/swagger';

/**
 * Swagger용 프로필 이미지 업로드 응답 클래스
 * API 문서화를 위한 프로필 이미지 업로드 성공 응답 스키마입니다.
 * AWS S3 업로드 기능을 사용합니다.
 */
export class ProfileImageUploadResponse {
  @ApiProperty({ 
    description: '업로드된 프로필 이미지 URL (AWS S3)', 
    example: 'https://your-bucket.s3.amazonaws.com/profile/user123/avatar.jpg' 
  })
  imageUrl: string;
}

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
