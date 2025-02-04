import { ApiProperty } from '@nestjs/swagger';

export class LoginResponse {
  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidXNlcjEyMyIsIm5pY2tuYW1lIjoibmlja25hbWUxMjMiLCJpYXQiOjE3Mzg1OTU4NDQsImV4cCI6MTgyNDkwOTQ0NH0.XQsmMYZ1t9o5EkT51CqLZOfMXqo8-j84ieKfHZVxz-k',
  })
  access_token: string;
}
