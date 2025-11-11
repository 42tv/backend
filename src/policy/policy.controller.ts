import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { PolicyService } from './policy.service';
import { AdminGuard } from '../auth/guard/admin.guard';
import { CreatePolicyDto, GetPolicyQueryDto } from './dto/policy-request.dto';
import { PolicyResponseDto } from './dto/policy-response.dto';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';

@Controller('policy')
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  @Post()
  @UseGuards(AdminGuard)
  async createPolicy(
    @Body() createPolicyDto: CreatePolicyDto,
  ): Promise<SuccessResponseDto<{ policy: PolicyResponseDto }>> {
    const policy = await this.policyService.createPolicy(createPolicyDto);
    return ResponseWrapper.success(
      { policy },
      '정책을 성공적으로 생성했습니다.',
    );
  }

  @Get()
  async getPolicies(
    @Query() query: GetPolicyQueryDto,
  ): Promise<SuccessResponseDto<any>> {
    if (query.page) {
      const policy = await this.policyService.getPolicyByPage(query.page);
      return ResponseWrapper.success(policy, '정책을 조회했습니다.');
    }
    const policies = await this.policyService.getAllPolicies();
    return ResponseWrapper.success({ policies }, '정책 목록을 조회했습니다.');
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async deletePolicy(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SuccessResponseDto<null>> {
    await this.policyService.deletePolicy(id);
    return ResponseWrapper.success(null, '정책이 성공적으로 삭제되었습니다.');
  }
}
