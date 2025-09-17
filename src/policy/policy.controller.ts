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
import {
  PolicyResponseDto,
  PolicyListResponseDto,
  PolicyCreateSuccessResponseDto,
} from './dto/policy-response.dto';

@Controller('policy')
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  @Post()
  @UseGuards(AdminGuard)
  async createPolicy(
    @Body() createPolicyDto: CreatePolicyDto,
  ): Promise<PolicyCreateSuccessResponseDto> {
    const policy = await this.policyService.createPolicy(createPolicyDto);
    return {
      success: '정책 생성 성공',
      policy,
    };
  }

  @Get()
  async getPolicies(
    @Query() query: GetPolicyQueryDto,
  ): Promise<PolicyResponseDto | PolicyListResponseDto> {
    if (query.page) {
      return this.policyService.getPolicyByPage(query.page);
    }
    return this.policyService.getAllPolicies();
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async deletePolicy(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.policyService.deletePolicy(id);
    return { message: '정책이 성공적으로 삭제되었습니다.' };
  }
}
