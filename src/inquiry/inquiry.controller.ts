import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { MemberGuard } from 'src/auth/guard/jwt.member.guard';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { InquiryService } from './inquiry.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { GetInquiriesQueryDto } from './dto/get-inquiries-query.dto';

@Controller('inquiry')
@UseGuards(MemberGuard)
export class InquiryController {
  constructor(private readonly inquiryService: InquiryService) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor('images', 5, {
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (_, file, cb) => {
        if (file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          cb(null, true);
        } else {
          cb(new Error('이미지 파일만 업로드 가능합니다.'), false);
        }
      },
    }),
  )
  async createInquiry(
    @Req() req: any,
    @Body() dto: CreateInquiryDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ): Promise<SuccessResponseDto<any>> {
    const result = await this.inquiryService.createInquiry(
      req.user.idx,
      dto,
      images,
    );
    return ResponseWrapper.success(result, '문의를 접수했습니다.');
  }

  @Get()
  async getMyInquiries(
    @Req() req: any,
    @Query(new ValidationPipe({ transform: true }))
    query: GetInquiriesQueryDto,
  ): Promise<SuccessResponseDto<{ inquiries: any[] }>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { items, total } = await this.inquiryService.getMyInquiries(
      req.user.idx,
      page,
      limit,
    );
    return ResponseWrapper.success(
      { inquiries: items },
      '내 문의 목록을 조회했습니다.',
      {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    );
  }

  @Get(':id')
  async getMyInquiry(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SuccessResponseDto<any>> {
    const inquiry = await this.inquiryService.getMyInquiry(req.user.idx, id);
    return ResponseWrapper.success(inquiry, '문의 상세를 조회했습니다.');
  }
}
