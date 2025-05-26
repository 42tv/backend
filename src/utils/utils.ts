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

export function timeFormatter(time: string) {
  const isoDate = time;

  // 1. Date 객체로 변환 (Z는 UTC를 의미함)
  const date = new Date(isoDate);

  // 2. 원하는 포맷으로 수동 포매팅
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0'); // 월은 0부터 시작
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');

  const formatted = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  return formatted;
}

export type UserIncludeOptions = {
  user_detail?: boolean;
  channel?: boolean;
  braodcast_setting?: boolean;
  ivs_channel?: boolean;
  coin?: boolean;
};

/* 
*  ServerCommand를 포함할 수 있는 구조체여야 하지만 현재는 확립 안되었음 
*  그래서 일단 DeleteCommand에 사용사례에 맞추어 정의됨됨
*/
export interface ServerCommand {
  command: 'delete';
  prev_server_id: number;
  room_id: string;
  user_id: string;
}

export interface RoomEvent {
  type: 'chat';
  broadcaster_id: string;
  chatter_idx: number;
  chatter_nickname: string;
  chatter_message: string;
}