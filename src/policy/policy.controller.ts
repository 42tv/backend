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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
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

@ApiTags('정책 관리')
@Controller('policy')
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  @Post()
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '정책 생성 (관리자 전용)' })
  @ApiResponse({
    status: 201,
    description: '정책이 성공적으로 생성되었습니다.',
    type: PolicyResponseDto,
  })
  @ApiResponse({ status: 409, description: '이미 존재하는 정책 페이지입니다.' })
  @ApiResponse({ status: 401, description: '관리자 권한이 필요합니다.' })
  async createPolicy(
    @Body() createPolicyDto: CreatePolicyDto,
  ): Promise<PolicyResponseDto> {
    return this.policyService.createPolicy(createPolicyDto);
  }

  @Get()
  @ApiOperation({
    summary: '모든 정책 목록 조회 (page 쿼리로 특정 정책 조회 가능)',
  })
  @ApiResponse({
    status: 200,
    description: '정책 목록이 성공적으로 조회되었습니다.',
  })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ID로 정책 조회 (관리자 전용)' })
  @ApiResponse({
    status: 200,
    description: '정책이 성공적으로 조회되었습니다.',
    type: PolicyResponseDto,
  })
  @ApiResponse({ status: 404, description: '정책을 찾을 수 없습니다.' })
  @ApiResponse({ status: 401, description: '관리자 권한이 필요합니다.' })
  async getPolicyById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PolicyResponseDto> {
    return this.policyService.getPolicyById(id);
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '정책 수정 (관리자 전용)' })
  @ApiResponse({
    status: 200,
    description: '정책이 성공적으로 수정되었습니다.',
    type: PolicyResponseDto,
  })
  @ApiResponse({ status: 404, description: '정책을 찾을 수 없습니다.' })
  @ApiResponse({ status: 401, description: '관리자 권한이 필요합니다.' })
  async updatePolicy(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePolicyDto: UpdatePolicyDto,
  ): Promise<PolicyResponseDto> {
    return this.policyService.updatePolicy(id, updatePolicyDto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '정책 삭제 (관리자 전용)' })
  @ApiResponse({
    status: 200,
    description: '정책이 성공적으로 삭제되었습니다.',
  })
  @ApiResponse({ status: 404, description: '정책을 찾을 수 없습니다.' })
  @ApiResponse({ status: 401, description: '관리자 권한이 필요합니다.' })
  async deletePolicy(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.policyService.deletePolicy(id);
    return { message: '정책이 성공적으로 삭제되었습니다.' };
  }

  // PolicyAgreement 관련 엔드포인트들
  @Post('agree/:page')
  @UseGuards(MemberGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '특정 정책에 동의 (로그인 회원)' })
  @ApiResponse({
    status: 201,
    description: '정책 동의가 성공적으로 완료되었습니다.',
    type: PolicyAgreementResponseDto,
  })
  @ApiResponse({ status: 404, description: '정책을 찾을 수 없습니다.' })
  @ApiResponse({ status: 409, description: '이미 해당 버전에 동의하셨습니다.' })
  async agreeToPolicyByPage(
    @Param('page') page: string,
    @Req() req: Request,
  ): Promise<PolicyAgreementResponseDto> {
    const userIdx = (req.user as any).idx;
    const ipAddress = req.ip || req.connection.remoteAddress;
    return this.policyService.agreeToPolicyByPage(userIdx, page, ipAddress);
  }

  @Get('agreements')
  @UseGuards(MemberGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 정책 동의 내역 조회 (로그인 회원)' })
  @ApiResponse({
    status: 200,
    description: '정책 동의 내역이 성공적으로 조회되었습니다.',
    type: UserPolicyAgreementsResponseDto,
  })
  async getUserPolicyAgreements(
    @Req() req: Request,
  ): Promise<UserPolicyAgreementsResponseDto> {
    const userIdx = (req.user as any).idx;
    return this.policyService.getUserPolicyAgreements(userIdx);
  }

  @Get('status/:page')
  @UseGuards(MemberGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '특정 정책 동의 상태 확인 (로그인 회원)' })
  @ApiResponse({
    status: 200,
    description: '정책 동의 상태가 성공적으로 조회되었습니다.',
    type: PolicyAgreementStatusDto,
  })
  @ApiResponse({ status: 404, description: '정책을 찾을 수 없습니다.' })
  async checkPolicyAgreementStatus(
    @Param('page') page: string,
    @Req() req: Request,
  ): Promise<PolicyAgreementStatusDto> {
    const userIdx = (req.user as any).idx;
    return this.policyService.checkPolicyAgreementStatus(userIdx, page);
  }

  @Get('status')
  @UseGuards(MemberGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '모든 정책 동의 상태 확인 (로그인 회원)' })
  @ApiResponse({
    status: 200,
    description: '모든 정책 동의 상태가 성공적으로 조회되었습니다.',
    type: [PolicyAgreementStatusDto],
  })
  async getAllPolicyAgreementStatuses(
    @Req() req: Request,
  ): Promise<PolicyAgreementStatusDto[]> {
    const userIdx = (req.user as any).idx;
    return this.policyService.getAllPolicyAgreementStatuses(userIdx);
  }
}
