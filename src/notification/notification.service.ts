import { Injectable } from '@nestjs/common';
import { InquiryService } from 'src/inquiry/inquiry.service';
import { NotificationRepository } from './notification.repository';

export interface NotificationSummary {
  unread_posts: number;
  unread_inquiries: number;
}

@Injectable()
export class NotificationService {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly inquiryService: InquiryService,
  ) {}

  /**
   * 뱃지 표시용 개인 알림 요약 (COUNT 쿼리 병렬 실행).
   */
  async getSummary(userIdx: number): Promise<NotificationSummary> {
    const [unreadPosts, unreadInquiries] = await Promise.all([
      this.repository.countUnreadPosts(userIdx),
      this.inquiryService.getUnreadCount(userIdx),
    ]);

    return {
      unread_posts: unreadPosts,
      unread_inquiries: unreadInquiries,
    };
  }
}
