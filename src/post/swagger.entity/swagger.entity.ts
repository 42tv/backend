import { ApiProperty } from '@nestjs/swagger';

export class PostBlockResponse {
  @ApiProperty({
    example: '차단 성공',
    description: '성공 메시지',
  })
  message: string;
}

export class PostUnBlockResponse {
  @ApiProperty({
    example: '차단 해제 성공',
    description: '차단 해제 성공',
  })
  message: string;
}

export class PostResponse {
  @ApiProperty({
    example: '쪽지를 성공적으로 보냈습니다.',
    description: '성공 메시지',
  })
  message: string;
}

export class PutResponse {
  @ApiProperty({
    example: '쪽지를 읽었습니다',
    description: '성공 메시지',
  })
  message: string;
}

export class DeleteResponse {
  @ApiProperty({
    example: '쪽지를 삭제했습니다',
    description: '성공 메시지',
  })
  message: string;
}

export class PostsData {
  id: number;
  message: string;
  sender: {
    idx: number;
    userId: string;
    nickname: string;
  };
  recipient: {
    idx: number;
    userId: string;
    nickname: string;
  };
  sentAt: string;
  readAt: string;
}

export class GetResponse {
  @ApiProperty({
    example: [
      [
        {
          id: 9,
          message: '대충 쪽지 내용1',
          sender: {
            idx: 5,
            userId: '3333',
            nickname: '3333',
          },
          recipient: {
            idx: 4,
            userId: '1234',
            nickname: '1234',
          },
          sentAt: '2025-03-10T15:12:33.468Z',
          readAt: '2025-03-10T15:12:33.468Z',
        },
        {
          id: 10,
          message: '대충 쪽지 내용12',
          sender: {
            idx: 5,
            userId: '3333',
            nickname: '3333',
          },
          recipient: {
            idx: 4,
            userId: '1234',
            nickname: '1234',
          },
          sentAt: '2025-03-10T15:12:35.952Z',
          readAt: null,
        },
        {
          id: 11,
          message: '대충 쪽지 내용123',
          sender: {
            idx: 5,
            userId: '3333',
            nickname: '3333',
          },
          recipient: {
            idx: 4,
            userId: '1234',
            nickname: '1234',
          },
          sentAt: '2025-03-10T15:12:37.378Z',
          readAt: null,
        },
        {
          id: 12,
          message: '대충 쪽지 내용1234',
          sender: {
            idx: 5,
            userId: '3333',
            nickname: '3333',
          },
          recipient: {
            idx: 4,
            userId: '1234',
            nickname: '1234',
          },
          sentAt: '2025-03-10T15:12:39.143Z',
          readAt: null,
        },
      ],
    ],
    description: 'post 내용',
  })
  posts: PostsData[];
}

export class PostBlockBadRequestResponse {
  @ApiProperty({ example: 400 })
  code: number;
  @ApiProperty({ example: '이미 존재하는 아이디입니다.' })
  message: any;
}
