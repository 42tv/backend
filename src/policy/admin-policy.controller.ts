import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { PolicyService } from './policy.service';
import { AdminGuard } from '../auth/guard/admin.guard';
import { CreatePolicyDto } from './dto/policy-request.dto';
import { PolicyResponseDto } from './dto/policy-response.dto';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';

@Controller('admin/policy')
@UseGuards(AdminGuard)
export class AdminPolicyController {
  constructor(private readonly policyService: PolicyService) {}

  @Post()
  async createPolicy(
    @Body() createPolicyDto: CreatePolicyDto,
  ): Promise<SuccessResponseDto<{ policy: PolicyResponseDto }>> {
    const policy = await this.policyService.createPolicy(createPolicyDto);
    return ResponseWrapper.success(
      { policy },
      '정책을 성공적으로 생성했습니다.',
    );
  }

  @Delete(':id')
  async deletePolicy(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SuccessResponseDto<null>> {
    await this.policyService.deletePolicy(id);
    return ResponseWrapper.success(null, '정책이 성공적으로 삭제되었습니다.');
  }
}
