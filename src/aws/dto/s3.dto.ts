import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * S3 파일 업로드 비즈니스 로직용 DTO
 * 실제 서비스 레이어에서 사용되는 데이터 전송 객체입니다.
 */
export class S3UploadDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  mimetype: string;

  // Buffer는 validation 불가하므로 any 타입 사용
  buffer: Buffer<ArrayBufferLike>;
}

/**
 * S3 파일 삭제 비즈니스 로직용 DTO
 * 실제 서비스 레이어에서 사용되는 데이터 전송 객체입니다.
 */
export class S3DeleteDto {
  @IsString()
  @IsNotEmpty()
  key: string;
}
