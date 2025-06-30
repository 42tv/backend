/**
 * 웹소켓 연결에서 정보를 전달하기 위한 용도의 JWT
 */
export interface WebsocketJwt {
  broadcaster: {
    idx: number;
    user_id: string;
    nickname: string;
    profile_img: string;
  };
  user: {
    idx: number;
    user_id: string;
    nickname: string;
    role: 'broadcaster' | 'manager' | 'member' | 'viewer' | 'guest';
    profile_img: string;
    is_guest: boolean;
    guest_id?: string;
  };
  stream: {
    idx: number;
    stream_id: string;
  };
}