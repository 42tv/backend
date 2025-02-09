import { ApiProperty } from '@nestjs/swagger';

export class LoginResponse {
  @ApiProperty({
    description: 'access_token 예제에 있는건 테스트용 999일짜리',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZHgiOjE0LCJ1c2VyX2lkIjoidXNlcjEyMyIsIm5pY2tuYW1lIjoibmlja25hbWUxMjMiLCJpYXQiOjE3MzkxMTE4ODIsImV4cCI6MTgyNTQyNTQ4Mn0.aedkaSuPjdgRjgiQgyzxKTPHrDw-rIyudYuiW3zG1wg',
  })
  access_token: string;
  @ApiProperty({
    description: 'refresh_token 예제에 있는건 테스트용 999일짜리',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZHgiOjE0LCJ1c2VyX2lkIjoidXNlcjEyMyIsIm5pY2tuYW1lIjoibmlja25hbWUxMjMiLCJpYXQiOjE3MzkxMTE4ODIsImV4cCI6MTgyNTQyNTQ4Mn0.iDCiW3IccIgbh4VZMv1fwEibXs5AGBRbOt0VFSKCiTw',
  })
  refresh_token: string;
}
