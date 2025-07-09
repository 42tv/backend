import { ApiProperty } from '@nestjs/swagger';

export class CreateIvsResponse {
  @ApiProperty({ example: 1, description: 'User 유니크 index' })
  user_idx: number;

  @ApiProperty({ example: 'user123', description: '사용자 ID' })
  arn: string;

  @ApiProperty({
    example: '632c5f96112a.global-contribute.live-video.net',
    description: 'ingest endpoint',
  })
  ingest_endpoint: string;

  @ApiProperty({
    example: 'something playback url',
    description: '재생 주소',
  })
  playback_url: string;

  @ApiProperty({
    example: 'something stream key',
    description: 'stream key',
  })
  stream_key: string;

  @ApiProperty({
    example: 'streamkey arn',
    description: 'streamkey arn',
  })
  stream_key_arn: string;

  @ApiProperty({
    example: 'user123',
    description: '채널명',
  })
  name: string;

  @ApiProperty({
    example: '2025-02-11T12:04:46.361Z',
    description: 'createdAt',
  })
  createdAt: string;
}
