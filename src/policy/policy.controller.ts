import { Controller, Get, Query } from '@nestjs/common';
import { PolicyService } from './policy.service';
import { GetPolicyQueryDto } from './dto/policy-request.dto';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';

@Controller('policy')
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

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
}
