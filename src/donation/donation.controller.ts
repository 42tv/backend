import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { DonationService } from './donation.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { GetDonationsQueryDto } from './dto/get-donations-query.dto';
import { GetStatsQueryDto } from './dto/get-stats-query.dto';
import { MemberGuard } from '../auth/guard/jwt.member.guard';
import { AdminGuard } from '../auth/guard/admin.guard';
import { GetUser } from '../auth/get-user.decorator';

@Controller('donation')
export class DonationController {
  constructor(private readonly donationService: DonationService) {}

  /**
   * 후원하기 (POST /donation)
   * @param createDonationDto 후원 정보
   * @param donorIdx 후원자 idx (JWT에서 추출)
   * @returns 생성된 후원 정보
   */
  @Post()
  @UseGuards(MemberGuard)
  async donate(
    @Body() createDonationDto: CreateDonationDto,
    @GetUser('idx') donorIdx: number,
  ) {
    const donation = await this.donationService.donate(
      donorIdx,
      createDonationDto.streamer_user_id,
      createDonationDto.coin_amount,
      createDonationDto.message,
    );

    return {
      message: '후원이 완료되었습니다',
      donation: {
        id: donation.id,
        coin_amount: donation.coin_amount,
        coin_value: donation.coin_value,
        message: donation.message,
        donated_at: donation.donated_at.toISOString(),
        streamer: {
          idx: donation.streamer.idx,
          nickname: donation.streamer.nickname,
          profile_img: donation.streamer.profile_img || '',
        },
      },
    };
  }

  /**
   * 받은 후원 목록 조회 (GET /donation/received)
   * @param query 쿼리 파라미터
   * @param streamerIdx 스트리머 idx (JWT에서 추출)
   * @returns 받은 후원 목록
   */
  @Get('received')
  @UseGuards(MemberGuard)
  async getReceivedDonations(
    @Query() query: GetDonationsQueryDto,
    @GetUser('idx') streamerIdx: number,
  ) {
    const options = {
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      limit: query.limit || 50,
      offset: query.offset || 0,
    };

    const donations = await this.donationService.findReceivedByStreamerIdx(
      streamerIdx,
      options,
    );

    // Total count 조회 (간단하게 donations 배열 길이 사용)
    const total = donations.length;

    return {
      donations: donations.map((d) => ({
        id: d.id,
        coin_amount: d.coin_amount,
        coin_value: d.coin_value,
        message: d.message,
        donated_at: d.donated_at.toISOString(),
        donor: {
          idx: d.donor.idx,
          nickname: d.donor.nickname,
          user_id: d.donor.user_id,
          profile_img: d.donor.profile_img || '',
        },
      })),
      total,
      limit: options.limit,
      offset: options.offset,
    };
  }

  /**
   * 보낸 후원 목록 조회 (GET /donation/sent)
   * @param query 쿼리 파라미터
   * @param donorIdx 후원자 idx (JWT에서 추출)
   * @returns 보낸 후원 목록
   */
  @Get('sent')
  @UseGuards(MemberGuard)
  async getSentDonations(
    @Query() query: GetDonationsQueryDto,
    @GetUser('idx') donorIdx: number,
  ) {
    const options = {
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      limit: query.limit || 50,
      offset: query.offset || 0,
    };

    const donations = await this.donationService.findSentByDonorIdx(
      donorIdx,
      options,
    );

    const total = donations.length;

    return {
      donations: donations.map((d) => ({
        id: d.id,
        coin_amount: d.coin_amount,
        coin_value: d.coin_value,
        message: d.message,
        donated_at: d.donated_at.toISOString(),
        streamer: {
          idx: d.streamer.idx,
          nickname: d.streamer.nickname,
          user_id: d.streamer.user_id,
          profile_img: d.streamer.profile_img || '',
        },
      })),
      total,
      limit: options.limit,
      offset: options.offset,
    };
  }

  /**
   * 후원 통계 조회 (GET /donation/stats)
   * @param query 쿼리 파라미터
   * @param streamerIdx 스트리머 idx (JWT에서 추출)
   * @returns 후원 통계
   */
  @Get('stats')
  @UseGuards(MemberGuard)
  async getStats(
    @Query() query: GetStatsQueryDto,
    @GetUser('idx') streamerIdx: number,
  ) {
    const options = {
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };

    const stats = await this.donationService.getReceivedStats(
      streamerIdx,
      options,
    );

    return stats;
  }

  /**
   * 후원 상세 조회 (GET /donation/:id)
   * @param id Donation ID
   * @returns 후원 상세 정보
   */
  @Get(':id')
  @UseGuards(AdminGuard)
  async getDonationById(@Param('id') id: string) {
    const donation = await this.donationService.findById(id);

    return {
      id: donation.id,
      coin_amount: donation.coin_amount,
      coin_value: donation.coin_value,
      message: donation.message,
      donated_at: donation.donated_at.toISOString(),
      donor: {
        idx: donation.donor.idx,
        nickname: donation.donor.nickname,
        user_id: donation.donor.user_id,
        profile_img: donation.donor.profile_img || '',
      },
      streamer: {
        idx: donation.streamer.idx,
        nickname: donation.streamer.nickname,
        user_id: donation.streamer.user_id,
        profile_img: donation.streamer.profile_img || '',
      },
      usages: donation.usages.map((usage) => ({
        id: usage.id,
        used_coins: usage.used_coins,
        topup: {
          id: usage.topup.id,
          product_name: usage.topup.product_name,
          topped_up_at: usage.topup.topped_up_at.toISOString(),
        },
      })),
    };
  }
}
