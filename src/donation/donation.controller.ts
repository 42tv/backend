import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { DonationService } from './donation.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { GetDonationsQueryDto } from './dto/get-donations-query.dto';
import { GetStatsQueryDto } from './dto/get-stats-query.dto';
import { MemberGuard } from '../auth/guard/jwt.member.guard';
import { GetUser } from '../auth/get-user.decorator';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { GetRankingQueryDto } from './dto/get-ranking-query.dto';
import { GetTrendQueryDto } from './dto/get-trend-query.dto';

// donated_at은 KST naive timestamp로 저장됨.
// endDate를 날짜 문자열(YYYY-MM-DD)로 받으면 new Date()가 당일 00:00:00이 되어
// 하루치 데이터가 모두 누락됨 → 23:59:59.999로 보정.
function parseEndDate(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setHours(23, 59, 59, 999);
  return d;
}

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
  ): Promise<SuccessResponseDto<{ donation: any }>> {
    const donation = await this.donationService.donate(
      donorIdx,
      createDonationDto.streamer_user_id,
      createDonationDto.coin_amount,
      createDonationDto.message,
    );

    return ResponseWrapper.success(
      {
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
      },
      '후원이 완료되었습니다.',
    );
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
  ): Promise<SuccessResponseDto<{ donations: any[] }>> {
    const options = {
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? parseEndDate(query.endDate) : undefined,
      limit: query.limit ? Number(query.limit) : 50,
      offset: query.offset ? Number(query.offset) : 0,
    };

    const { items, total } =
      await this.donationService.findReceivedByStreamerIdx(
        streamerIdx,
        options,
      );
    const donations = items.map((d) => ({
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
    }));
    const pagination = {
      page: Math.floor((options.offset || 0) / options.limit) + 1,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit),
    };
    return ResponseWrapper.success(
      { donations },
      '받은 후원 목록을 조회했습니다.',
      pagination,
    );
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
  ): Promise<SuccessResponseDto<{ donations: any[] }>> {
    const options = {
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? parseEndDate(query.endDate) : undefined,
      limit: query.limit ? Number(query.limit) : 50,
      offset: query.offset ? Number(query.offset) : 0,
    };

    const { items, total } = await this.donationService.findSentByDonorIdx(
      donorIdx,
      options,
    );
    const donations = items.map((d) => ({
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
    }));
    const pagination = {
      page: Math.floor((options.offset || 0) / options.limit) + 1,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit),
    };
    return ResponseWrapper.success(
      { donations },
      '보낸 후원 목록을 조회했습니다.',
      pagination,
    );
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
  ): Promise<SuccessResponseDto<any>> {
    const options = {
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? parseEndDate(query.endDate) : undefined,
    };

    const stats = await this.donationService.getReceivedStats(
      streamerIdx,
      options,
    );

    return ResponseWrapper.success(stats, '후원 통계를 조회했습니다.');
  }

  /**
   * 후원 순위 조회 (GET /donation/stats/ranking)
   * @param query 쿼리 파라미터
   * @param streamerIdx 스트리머 idx (JWT에서 추출)
   * @returns 상위 10명 후원자 순위
   */
  @Get('stats/ranking')
  @UseGuards(MemberGuard)
  async getRanking(
    @Query() query: GetRankingQueryDto,
    @GetUser('idx') streamerIdx: number,
  ): Promise<SuccessResponseDto<{ ranking: any[] }>> {
    const options = {
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? parseEndDate(query.endDate) : undefined,
      limit: 10,
    };

    const donors = await this.donationService.getTopDonors(
      streamerIdx,
      options,
    );
    return ResponseWrapper.success(
      { ranking: donors.map((d, i) => ({ rank: i + 1, ...d })) },
      '후원 순위를 조회했습니다.',
    );
  }

  /**
   * 기간별 후원 추이 조회 (GET /donation/stats/trend)
   * @param query 쿼리 파라미터
   * @param streamerIdx 스트리머 idx (JWT에서 추출)
   * @returns 기간별 후원 집계 데이터
   */
  @Get('stats/trend')
  @UseGuards(MemberGuard)
  async getTrend(
    @Query() query: GetTrendQueryDto,
    @GetUser('idx') streamerIdx: number,
  ): Promise<SuccessResponseDto<{ trend: any[] }>> {
    const trend = await this.donationService.getDonationTrend(streamerIdx, {
      startDate: new Date(query.startDate),
      endDate: parseEndDate(query.endDate),
      unit: query.unit || 'day',
    });
    return ResponseWrapper.success({ trend }, '후원 추이를 조회했습니다.');
  }
}
