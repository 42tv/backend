import { ApiProperty } from '@nestjs/swagger';
export class AuthEntity {
  @ApiProperty({
    example: 'user123',
    description: '사용자 ID. LocalAuthGard로 인해 username이라는 명칭',
  })
  username: number;

  @ApiProperty({ example: 'password123!', description: '비밀번호' })
  password: string;
}

export class AuthFailResponse {
  @ApiProperty({ example: 401 })
  code: number;
  @ApiProperty({ example: 'Unauthorized' })
  message: any;
}
