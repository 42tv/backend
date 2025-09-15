import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { PolicyService } from './policy.service';
import { AdminGuard } from '../auth/guard/admin.guard';
import { MemberGuard } from '../auth/guard/jwt.member.guard';
import { Request } from 'express';
import {
  CreatePolicyDto,
  UpdatePolicyDto,
  GetPolicyQueryDto,
} from './dto/policy-request.dto';
import {
  PolicyResponseDto,
  PolicyListResponseDto,
} from './dto/policy-response.dto';
import {
  PolicyAgreementResponseDto,
  UserPolicyAgreementsResponseDto,
  PolicyAgreementStatusDto,
} from './dto/policy-agreement.dto';

@Controller('policy')
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  @Post()
  @UseGuards(AdminGuard)
  async createPolicy(
    @Body() createPolicyDto: CreatePolicyDto,
  ): Promise<PolicyResponseDto> {
    return this.policyService.createPolicy(createPolicyDto);
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

  @Get(':id')
  @UseGuards(AdminGuard)
  async getPolicyById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PolicyResponseDto> {
    return this.policyService.getPolicyById(id);
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  async updatePolicy(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePolicyDto: UpdatePolicyDto,
  ): Promise<PolicyResponseDto> {
    return this.policyService.updatePolicy(id, updatePolicyDto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async deletePolicy(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.policyService.deletePolicy(id);
    return { message: '정책이 성공적으로 삭제되었습니다.' };
  }

  // PolicyAgreement 관련 엔드포인트들
  @Post('agree/:page')
  @UseGuards(MemberGuard)
  async agreeToPolicyByPage(
    @Param('page') page: string,
    @Req() req: Request,
  ): Promise<PolicyAgreementResponseDto> {
    const userIdx = (req.user as any).idx;
    const ipAddress = req.ip || req.socket.remoteAddress;
    return this.policyService.agreeToPolicyByPage(userIdx, page, ipAddress);
  }

  @Get('agreements')
  @UseGuards(MemberGuard)
  async getUserPolicyAgreements(
    @Req() req: Request,
  ): Promise<UserPolicyAgreementsResponseDto> {
    const userIdx = (req.user as any).idx;
    return this.policyService.getUserPolicyAgreements(userIdx);
  }

  @Get('status/:page')
  @UseGuards(MemberGuard)
  async checkPolicyAgreementStatus(
    @Param('page') page: string,
    @Req() req: Request,
  ): Promise<PolicyAgreementStatusDto> {
    const userIdx = (req.user as any).idx;
    return this.policyService.checkPolicyAgreementStatus(userIdx, page);
  }

  @Get('status')
  @UseGuards(MemberGuard)
  async getAllPolicyAgreementStatuses(
    @Req() req: Request,
  ): Promise<PolicyAgreementStatusDto[]> {
    const userIdx = (req.user as any).idx;
    return this.policyService.getAllPolicyAgreementStatuses(userIdx);
  }
}
