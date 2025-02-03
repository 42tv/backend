import { ApiProperty } from '@nestjs/swagger';
export class CustomBadRequestResponse {
  @ApiProperty({ example: 400 })
  code: number;
  @ApiProperty({ example: '이미 존재하는 아이디입니다.' })
  message: any;
}

export class CustomInternalServerErrorResponse {
  @ApiProperty({ example: 500 })
  code: number;
  @ApiProperty({ example: '내부 서버 오류가 발생하였습니다.' })
  message: any;
}
