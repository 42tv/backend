import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InquiryStatus, InquiryType } from '@prisma/client';
import * as sharp from 'sharp';
import { AwsService } from 'src/aws/aws.service';
import { AdminAuditLogService } from 'src/admin-audit-log/admin-audit-log.service';
import { InquiryRepository } from './inquiry.repository';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { AnswerInquiryDto } from './dto/answer-inquiry.dto';

@Injectable()
export class InquiryService {
  constructor(
    private readonly repository: InquiryRepository,
    private readonly awsService: AwsService,
    private readonly auditLogService: AdminAuditLogService,
  ) {}

  /**
   * 문의 접수 (유저용).
   * S3 업로드는 트랜잭션 밖(먼저) 수행 — DB 실패 시 S3 고아 파일은 허용.
   */
  async createInquiry(
    userIdx: number,
    dto: CreateInquiryDto,
    images?: Express.Multer.File[],
  ) {
    if (!dto.title.trim()) {
      throw new HttpException('제목을 입력해주세요.', HttpStatus.BAD_REQUEST);
    }
    if (!dto.content.trim()) {
      throw new HttpException('내용을 입력해주세요.', HttpStatus.BAD_REQUEST);
    }

    // 1. 이미지 리사이즈 후 S3 업로드
    const imageUrls: string[] = [];
    if (images && images.length > 0) {
      const timestamp = Date.now();
      for (let i = 0; i < images.length; i++) {
        const url = await this.uploadImageToS3(
          images[i],
          userIdx,
          timestamp,
          i,
        );
        imageUrls.push(url);
      }
    }

    // 2. Inquiry + InquiryImage 저장 (트랜잭션)
    await this.repository.executeTransaction(async (tx) => {
      const inquiry = await this.repository.create(
        userIdx,
        {
          type: dto.type,
          title: dto.title.trim(),
          content: dto.content.trim(),
        },
        tx,
      );
      if (imageUrls.length > 0) {
        await this.repository.createImages(inquiry.id, imageUrls, tx);
      }
      return inquiry;
    });

    return {
      code: 200,
      message: '문의가 성공적으로 접수되었습니다.',
    };
  }

  /**
   * 내 문의 목록 (유저용, 페이지네이션)
   */
  async getMyInquiries(userIdx: number, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const { items, total } = await this.repository.findByUser(userIdx, {
      limit,
      offset,
    });
    return { items, total, page, limit };
  }

  /**
   * 내 문의 상세 (유저용).
   * 답변이 있고 미읽음이면 조회 시점에 읽음 처리한다.
   */
  async getMyInquiry(userIdx: number, id: number) {
    const inquiry = await this.repository.findById(id);
    if (!inquiry) {
      throw new HttpException('문의를 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    }
    if (inquiry.user_idx !== userIdx) {
      throw new HttpException(
        '본인의 문의만 조회할 수 있습니다.',
        HttpStatus.FORBIDDEN,
      );
    }
    if (inquiry.status === InquiryStatus.ANSWERED && !inquiry.is_answer_read) {
      await this.repository.markAnswerRead(id);
      inquiry.is_answer_read = true;
    }
    return inquiry;
  }

  /**
   * 미읽음 답변 개수 (유저용, 뱃지 표시)
   */
  async getUnreadCount(userIdx: number): Promise<number> {
    return await this.repository.countUnread(userIdx);
  }

  /**
   * 문의 목록 (관리자용, status/type 필터 + 페이지네이션)
   */
  async findAllForAdmin(options: {
    status?: InquiryStatus;
    type?: InquiryType;
    limit: number;
    offset: number;
  }) {
    return await this.repository.findAllForAdmin(options);
  }

  /**
   * 문의 상세 (관리자용)
   */
  async findDetailForAdmin(id: number) {
    const inquiry = await this.repository.findById(id);
    if (!inquiry) {
      throw new HttpException('문의를 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    }
    return inquiry;
  }

  /**
   * 답변 등록/수정 (관리자용).
   * 재답변 시 덮어쓰기하며 is_answer_read를 false로 되돌려 사용자가 다시 알 수 있게 한다.
   */
  async answerInquiry(adminIdx: number, id: number, dto: AnswerInquiryDto) {
    const inquiry = await this.repository.findById(id);
    if (!inquiry) {
      throw new HttpException('문의를 찾을 수 없습니다.', HttpStatus.NOT_FOUND);
    }

    const answered = await this.repository.answer(id, adminIdx, dto.answer);

    await this.auditLogService.record({
      adminIdx,
      action: 'INQUIRY_ANSWER',
      targetType: 'INQUIRY',
      targetId: id,
      detail: {
        inquiry_user_idx: inquiry.user_idx,
        is_reanswer: inquiry.status === InquiryStatus.ANSWERED,
      },
    });

    return answered;
  }

  private async uploadImageToS3(
    image: Express.Multer.File,
    userIdx: number,
    timestamp: number,
    imageOrder: number,
  ): Promise<string> {
    const s3Key = `inquiry/${userIdx}/${timestamp}_${imageOrder}.jpg`;

    const resizedBuffer = await sharp(image.buffer)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    await this.awsService.uploadToS3(s3Key, resizedBuffer, 'image/jpeg');

    return `${process.env.CDN_URL}/${s3Key}`;
  }
}
