import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * IVS 이벤트 콜백 요청 DTO
 */
export class IvsEventDto {
  @ApiProperty({
    description: '이벤트 ID',
    example: 'evt_12345'
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: '이벤트 발생 시간',
    example: '2024-01-01T00:00:00.000Z'
  })
  @IsString()
  @IsNotEmpty()
  time: string;

  @ApiProperty({
    description: '리소스 ARN',
    example: 'arn:aws:ivs:region:account:channel/channel-id'
  })
  @IsString()
  @IsNotEmpty()
  resource: string;

  @ApiProperty({
    description: '이벤트 이름',
    example: 'Stream Start'
  })
  @IsString()
  @IsNotEmpty()
  eventName: string;

  @ApiProperty({
    description: '채널 이름',
    example: 'user123'
  })
  @IsString()
  @IsNotEmpty()
  channelName: string;

  @ApiProperty({
    description: '스트림 ID',
    example: 'st_12345'
  })
  @IsString()
  @IsNotEmpty()
  streamId: string;

  @ApiProperty({
    description: '이벤트 코드',
    example: '200'
  })
  @IsString()
  code: string;
}
