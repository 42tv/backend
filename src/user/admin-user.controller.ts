import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from 'src/auth/guard/admin.guard';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { AdminUserService } from './admin-user.service';
import { AdminUserStatusFilter } from './admin-user.repository';
import { AdminPrivacyViewDto } from './dto/admin-privacy-view.dto';
import {
  AdminToggleAdminRoleDto,
  AdminUpdateNicknameDto,
  AdminUserActionReasonDto,
} from './dto/admin-update-user.dto';

function parseBoolean(value?: string): boolean | undefined {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

@Controller('admin/users')
@UseGuards(AdminGuard)
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Get()
  async getUsers(
    @Query('search') search?: string,
    @Query('provider') provider?: string,
    @Query('identityVerified') identityVerified?: string,
    @Query('adultVerified') adultVerified?: string,
    @Query('isAdmin') isAdmin?: string,
    @Query('businessType') businessType?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<SuccessResponseDto<{ users: any[] }>> {
    const take = limit ? parseInt(limit, 10) : 20;
    const currentPage = page ? parseInt(page, 10) : 1;

    const { items, total } = await this.adminUserService.findAll({
      search,
      provider,
      identityVerified: parseBoolean(identityVerified),
      adultVerified: parseBoolean(adultVerified),
      isAdmin: parseBoolean(isAdmin),
      businessType,
      status: ['ACTIVE', 'SUSPENDED', 'BROADCAST_BANNED'].includes(status)
        ? (status as AdminUserStatusFilter)
        : undefined,
      limit: take,
      offset: (currentPage - 1) * take,
    });

    return ResponseWrapper.success(
      { users: items },
      '회원 목록을 조회했습니다.',
      {
        page: currentPage,
        limit: take,
        total,
        totalPages: Math.ceil(total / take) || 1,
      },
    );
  }

  @Get(':idx')
  async getUserDetail(
    @Param('idx', ParseIntPipe) idx: number,
  ): Promise<SuccessResponseDto<any>> {
    const user = await this.adminUserService.findDetail(idx);
    return ResponseWrapper.success(user, '회원 상세를 조회했습니다.');
  }

  @Post(':idx/privacy-view')
  async viewPrivacyField(
    @Req() req,
    @Param('idx', ParseIntPipe) idx: number,
    @Body() dto: AdminPrivacyViewDto,
  ): Promise<SuccessResponseDto<any>> {
    const result = await this.adminUserService.viewPrivacyField(
      req.user.idx,
      idx,
      dto.field,
      dto.reason,
    );
    return ResponseWrapper.success(result, '개인정보 원문을 열람했습니다.');
  }

  @Patch(':idx/nickname')
  async forceUpdateNickname(
    @Req() req,
    @Param('idx', ParseIntPipe) idx: number,
    @Body() dto: AdminUpdateNicknameDto,
  ): Promise<SuccessResponseDto<any>> {
    const user = await this.adminUserService.forceUpdateNickname(
      req.user.idx,
      idx,
      dto.nickname,
      dto.reason,
    );
    return ResponseWrapper.success(user, '닉네임을 강제 변경했습니다.');
  }

  @Delete(':idx/profile-image')
  async forceDeleteProfileImage(
    @Req() req,
    @Param('idx', ParseIntPipe) idx: number,
    @Body() dto: AdminUserActionReasonDto,
  ): Promise<SuccessResponseDto<null>> {
    await this.adminUserService.forceDeleteProfileImage(
      req.user.idx,
      idx,
      dto?.reason,
    );
    return ResponseWrapper.success(null, '프로필 이미지를 삭제했습니다.');
  }

  @Patch(':idx/admin-role')
  async toggleAdminRole(
    @Req() req,
    @Param('idx', ParseIntPipe) idx: number,
    @Body() dto: AdminToggleAdminRoleDto,
  ): Promise<SuccessResponseDto<any>> {
    const result = await this.adminUserService.toggleAdminRole(
      req.user.idx,
      idx,
      dto.isAdmin,
      dto.reason,
    );
    return ResponseWrapper.success(
      result,
      dto.isAdmin
        ? '관리자 권한을 부여했습니다.'
        : '관리자 권한을 회수했습니다.',
    );
  }

  @Post(':idx/force-delete')
  async forceDeleteUser(
    @Req() req,
    @Param('idx', ParseIntPipe) idx: number,
    @Body() dto: AdminUserActionReasonDto,
  ): Promise<SuccessResponseDto<null>> {
    await this.adminUserService.forceDeleteUser(
      req.user.idx,
      idx,
      dto?.reason ?? '관리자 강제 탈퇴',
    );
    return ResponseWrapper.success(null, '회원을 강제 탈퇴 처리했습니다.');
  }
}
