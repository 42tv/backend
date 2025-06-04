import { BadRequestException, Injectable } from '@nestjs/common';
import { BookmarkRepository } from './bookmark.repository';

@Injectable()
export class BookmarkService {
  constructor(private readonly bookmarkRepository: BookmarkRepository) {}

  /**
   * 북마크 추가
   * @param bookmarker_idx 북마크를 추가하는 사용자 ID
   * @param bookmarked_user_id 북마크 대상 사용자 ID
   * @returns 성공 메시지
   */
  async addBookmark(bookmarker_idx: number, bookmarked_idx: number) {
    await this.bookmarkRepository.createBookmark(
      bookmarker_idx,
      bookmarked_idx,
    );
  }

  /**
   * 북마크 삭제
   * @param bookmarker_idx 북마크를 삭제하는 사용자 ID
   * @param bookmarked_user_id 북마크 대상 사용자 ID
   * @returns 성공 메시지
   */
  async removeBookmark(bookmarker_idx: number, bookmarked_idx: number) {
    await this.bookmarkRepository.deleteBookmark(
      bookmarker_idx,
      bookmarked_idx,
    );
  }

  /**
   * 사용자의 북마크 목록 조회
   * @param user_idx 사용자 ID
   * @returns 북마크 목록
   */
  async getUserBookmarks(user_idx: number) {
    const bookmarks = await this.bookmarkRepository.findAllBookmarks(user_idx);

    return {
      bookmarks: bookmarks.map((bookmark) => ({
        id: bookmark.id,
        user_id: bookmark.bookmarked.user_id,
        nickname: bookmark.bookmarked.nickname,
        profile_img: bookmark.bookmarked.profile_img,
        hidden: bookmark.hidden,
        created_at: bookmark.created_at,
      })),
      count: bookmarks.length,
    };
  }

  /**
   * 사용자가 받은 북마크 수 조회
   * @param user_idx 사용자 ID
   * @returns 북마크 수
   */
  async getUserBookmarkCount(user_idx: number) {
    const count = await this.bookmarkRepository.countBookmarkedBy(user_idx);
    return { count };
  }

  /**
   * 북마크 여러개 삭제
   */
  async deleteBookmarks(user_idx: number, ids: number[]) {
    try {
      await this.bookmarkRepository.deleteBookmarks(user_idx, ids);
    } catch (e) {
      throw new BadRequestException('유효하지 않은 북마크 삭제요청입니다');
    }

    return {
      message: '북마크 삭제 완료',
    };
  }
}
