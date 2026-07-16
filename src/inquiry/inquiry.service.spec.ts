import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { InquiryStatus, InquiryType } from '@prisma/client';
import { InquiryService } from './inquiry.service';
import { InquiryRepository } from './inquiry.repository';
import { AwsService } from 'src/aws/aws.service';
import { AdminAuditLogService } from 'src/admin-audit-log/admin-audit-log.service';

describe('InquiryService', () => {
  let service: InquiryService;

  const mockRepository = {
    create: jest.fn(),
    createImages: jest.fn(),
    findByUser: jest.fn(),
    findById: jest.fn(),
    findAllForAdmin: jest.fn(),
    countUnread: jest.fn(),
    markAnswerRead: jest.fn(),
    answer: jest.fn(),
    executeTransaction: jest.fn(
      async (callback: (tx: unknown) => Promise<unknown>) => callback({}),
    ),
  };

  const mockAwsService = {
    uploadToS3: jest.fn(),
  };

  const mockAuditLogService = {
    record: jest.fn(),
  };

  const baseInquiry = {
    id: 1,
    user_idx: 10,
    type: InquiryType.GENERAL,
    title: '제목',
    content: '내용',
    status: InquiryStatus.PENDING,
    answer: null,
    answered_by: null,
    answered_at: null,
    is_answer_read: false,
    images: [],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InquiryService,
        { provide: InquiryRepository, useValue: mockRepository },
        { provide: AwsService, useValue: mockAwsService },
        { provide: AdminAuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<InquiryService>(InquiryService);
  });

  describe('createInquiry', () => {
    it('제목이 공백이면 BAD_REQUEST를 던진다', async () => {
      await expect(
        service.createInquiry(10, {
          type: InquiryType.GENERAL,
          title: '   ',
          content: '내용',
        }),
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    });

    it('이미지 없이 문의를 생성한다', async () => {
      mockRepository.create.mockResolvedValue(baseInquiry);

      const result = await service.createInquiry(10, {
        type: InquiryType.GENERAL,
        title: '제목',
        content: '내용',
      });

      expect(mockRepository.create).toHaveBeenCalledWith(
        10,
        { type: InquiryType.GENERAL, title: '제목', content: '내용' },
        expect.anything(),
      );
      expect(mockRepository.createImages).not.toHaveBeenCalled();
      expect(mockAwsService.uploadToS3).not.toHaveBeenCalled();
      expect(result).toEqual({
        code: 200,
        message: '문의가 성공적으로 접수되었습니다.',
      });
    });
  });

  describe('getMyInquiry', () => {
    it('문의가 없으면 NOT_FOUND를 던진다', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getMyInquiry(10, 999)).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });

    it('본인 문의가 아니면 FORBIDDEN을 던진다', async () => {
      mockRepository.findById.mockResolvedValue({
        ...baseInquiry,
        user_idx: 99,
      });

      await expect(service.getMyInquiry(10, 1)).rejects.toThrow(HttpException);
      await expect(service.getMyInquiry(10, 1)).rejects.toMatchObject({
        status: HttpStatus.FORBIDDEN,
      });
      expect(mockRepository.markAnswerRead).not.toHaveBeenCalled();
    });

    it('답변 완료 + 미읽음이면 읽음 처리한다', async () => {
      mockRepository.findById.mockResolvedValue({
        ...baseInquiry,
        status: InquiryStatus.ANSWERED,
        answer: '답변입니다',
        is_answer_read: false,
      });

      const result = await service.getMyInquiry(10, 1);

      expect(mockRepository.markAnswerRead).toHaveBeenCalledWith(1);
      expect(result.is_answer_read).toBe(true);
    });

    it('답변 대기 상태면 읽음 처리하지 않는다', async () => {
      mockRepository.findById.mockResolvedValue({ ...baseInquiry });

      await service.getMyInquiry(10, 1);

      expect(mockRepository.markAnswerRead).not.toHaveBeenCalled();
    });

    it('이미 읽은 답변은 다시 읽음 처리하지 않는다', async () => {
      mockRepository.findById.mockResolvedValue({
        ...baseInquiry,
        status: InquiryStatus.ANSWERED,
        answer: '답변입니다',
        is_answer_read: true,
      });

      await service.getMyInquiry(10, 1);

      expect(mockRepository.markAnswerRead).not.toHaveBeenCalled();
    });
  });

  describe('getUnreadCount', () => {
    it('미읽음 답변 개수를 반환한다', async () => {
      mockRepository.countUnread.mockResolvedValue(3);

      const count = await service.getUnreadCount(10);

      expect(mockRepository.countUnread).toHaveBeenCalledWith(10);
      expect(count).toBe(3);
    });
  });

  describe('answerInquiry', () => {
    it('문의가 없으면 NOT_FOUND를 던진다', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.answerInquiry(1, 999, { answer: '답변' }),
      ).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
      expect(mockRepository.answer).not.toHaveBeenCalled();
    });

    it('답변 등록 시 상태 전환 + 감사 로그를 기록한다', async () => {
      mockRepository.findById.mockResolvedValue({ ...baseInquiry });
      mockRepository.answer.mockResolvedValue({
        ...baseInquiry,
        status: InquiryStatus.ANSWERED,
        answer: '답변',
        answered_by: 1,
        is_answer_read: false,
      });

      const result = await service.answerInquiry(1, 1, { answer: '답변' });

      expect(mockRepository.answer).toHaveBeenCalledWith(1, 1, '답변');
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          adminIdx: 1,
          action: 'INQUIRY_ANSWER',
          targetType: 'INQUIRY',
          targetId: 1,
        }),
      );
      expect(result.status).toBe(InquiryStatus.ANSWERED);
      expect(result.is_answer_read).toBe(false);
    });

    it('재답변 시 감사 로그에 is_reanswer가 기록된다', async () => {
      mockRepository.findById.mockResolvedValue({
        ...baseInquiry,
        status: InquiryStatus.ANSWERED,
        answer: '기존 답변',
      });
      mockRepository.answer.mockResolvedValue({
        ...baseInquiry,
        status: InquiryStatus.ANSWERED,
        answer: '새 답변',
        is_answer_read: false,
      });

      await service.answerInquiry(1, 1, { answer: '새 답변' });

      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({ is_reanswer: true }),
        }),
      );
    });
  });
});
