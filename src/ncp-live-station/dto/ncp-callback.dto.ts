import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * NCP Live Station 콜백 수신 페이로드 (NCP → 우리 서버 POST).
 * IVS 의 IvsEventDto 대응. event 는 코드 의미가 확정 전이므로 IsString 으로 두고
 * 서비스에서 알려진 코드만 분기(미지 코드는 무시)한다.
 */
export class NcpCallbackDto {
  @IsInt()
  id: number;

  @IsString()
  @IsOptional()
  logLevel?: string; // 'INFO' | 'ERROR'

  @IsString()
  @IsNotEmpty()
  channelId: string;

  @IsString()
  @IsNotEmpty()
  event: string; // 'PUBLISH_START' | 'PUBLISH_END' | 'ONAIR_START' | 'ONAIR_END' | 'STREAM_UPDATE'

  @IsInt()
  timestamp: number; // ms Unix
}
