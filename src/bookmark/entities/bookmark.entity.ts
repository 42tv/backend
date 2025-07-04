import { Bookmark, User } from '@prisma/client';

export interface BookmarkWithUser extends Bookmark {
  bookmarked: User;
}

export interface BookmarkEvent {
  type: 'bookmark';
  action: 'add' | 'delete';
  user_idx: number;
  broadcaster_id: string;
}

export interface BookmarkResponse {
  id: number;
  bookmarker_idx: number;
  bookmarked_idx: number;
  created_at: Date;
  bookmarked?: {
    idx: number;
    user_id: string;
    nickname: string;
    profile_img: string;
  };
}
