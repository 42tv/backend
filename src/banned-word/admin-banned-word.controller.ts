import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from 'src/auth/guard/admin.guard';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { BannedWordService } from './banned-word.service';
import { CreateBannedWordDto } from './dto/create-banned-word.dto';

@Controller('admin/banned-words')
@UseGuards(AdminGuard)
export class AdminBannedWordController {
  constructor(private readonly bannedWordService: BannedWordService) {}

  @Get()
  async getBannedWords(): Promise<SuccessResponseDto<any[]>> {
    const words = await this.bannedWordService.findAll();
    return ResponseWrapper.success(words, '금칙어 목록을 조회했습니다.');
  }

  @Post()
  async createBannedWord(
    @Req() req,
    @Body() dto: CreateBannedWordDto,
  ): Promise<SuccessResponseDto<any>> {
    const created = await this.bannedWordService.create(
      req.user.idx,
      dto.word,
      dto.action,
    );
    return ResponseWrapper.success(created, '금칙어를 등록했습니다.');
  }

  @Delete(':id')
  async deleteBannedWord(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SuccessResponseDto<null>> {
    await this.bannedWordService.delete(req.user.idx, id);
    return ResponseWrapper.success(null, '금칙어를 삭제했습니다.');
  }
}
