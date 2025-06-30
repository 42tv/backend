export interface PlayResponse {
  broadcaster: {
    idx: number;
    user_id: string;
    nickname: string;
    profile_img: string;
  };
  stream: {
    title: string;
    playback_url: string;
    play_cnt: number;
    recommend_cnt: number;
    bookmark_cnt: number;
    start_time: string;
  };
  user: {
    user_idx: number;
    user_id: string;
    nickname: string;
    profile_img: string;
    is_bookmarked: boolean;
    role: 'broadcaster' | 'manager' | 'member' | 'viewer' | 'guest';
    play_token: string;
    is_guest: boolean;
    guest_id?: string; // 게스트 ID (게스트인 경우에만 존재)
  };
}