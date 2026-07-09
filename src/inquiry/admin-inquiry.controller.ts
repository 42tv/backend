import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AdminGuard } from 'src/auth/guard/admin.guard';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { InquiryService } from './inquiry.service';
import { AnswerInquiryDto } from './dto/answer-inquiry.dto';
import { GetInquiriesQueryDto } from './dto/get-inquiries-query.dto';

@Controller('admin/inquiries')
@UseGuards(AdminGuard)
export class AdminInquiryController {
  constructor(private readonly inquiryService: InquiryService) {}

  @Get()
  async getInquiries(
    @Query(new ValidationPipe({ transform: true }))
    query: GetInquiriesQueryDto,
  ): Promise<SuccessResponseDto<{ inquiries: any[] }>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { items, total } = await this.inquiryService.findAllForAdmin({
      status: query.status,
      type: query.type,
      limit,
      offset: (page - 1) * limit,
    });
    return ResponseWrapper.success(
      { inquiries: items },
      '문의 목록을 조회했습니다.',
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    );
  }

  @Get(':id')
  async getInquiryDetail(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SuccessResponseDto<any>> {
    const inquiry = await this.inquiryService.findDetailForAdmin(id);
    return ResponseWrapper.success(inquiry, '문의 상세를 조회했습니다.');
  }

  @Post(':id/answer')
  async answerInquiry(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AnswerInquiryDto,
  ): Promise<SuccessResponseDto<any>> {
    const answered = await this.inquiryService.answerInquiry(
      req.user.idx,
      id,
      dto,
    );
    return ResponseWrapper.success(answered, '답변을 등록했습니다.');
  }
}
