import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from 'src/auth/guard/admin.guard';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { DonationRepository } from './donation.repository';

@Controller('admin/donations')
@UseGuards(AdminGuard)
export class AdminDonationController {
  constructor(private readonly donationRepository: DonationRepository) {}

  @Get()
  async getDonations(
    @Query('donorIdx') donorIdx?: string,
    @Query('streamerIdx') streamerIdx?: string,
    @Query('minAmount') minAmount?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<SuccessResponseDto<{ donations: any[] }>> {
    const take = limit ? parseInt(limit, 10) : 20;
    const currentPage = page ? parseInt(page, 10) : 1;

    const { items, total } = await this.donationRepository.findAllAdmin({
      donorIdx: donorIdx ? parseInt(donorIdx, 10) : undefined,
      streamerIdx: streamerIdx ? parseInt(streamerIdx, 10) : undefined,
      minAmount: minAmount ? parseInt(minAmount, 10) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: take,
      offset: (currentPage - 1) * take,
    });

    // 탈퇴 회원은 relation이 끊기므로 스냅샷으로 폴백
    const donations = items.map((donation) => ({
      id: donation.id,
      coin_amount: donation.coin_amount,
      coin_value: donation.coin_value,
      message: donation.message,
      donated_at: donation.donated_at,
      donor: donation.donor ?? donation.donor_snapshot,
      streamer: donation.streamer ?? donation.streamer_snapshot,
    }));

    return ResponseWrapper.success({ donations }, '후원 내역을 조회했습니다.', {
      page: currentPage,
      limit: take,
      total,
      totalPages: Math.ceil(total / take) || 1,
    });
  }
}
