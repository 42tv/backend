import { ApiProperty } from '@nestjs/swagger';

export class LoginResponse {
  @ApiProperty({
    description: 'access_token 예제에 있는건 테스트용 999일짜리',
    example:
      'something jwt',
  })
  access_token: string;
  @ApiProperty({
    description: 'refresh_token 예제에 있는건 테스트용 999일짜리',
    example:
      'something jwt',
  })
  refresh_token: string;
}
