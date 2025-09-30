export class UsageResponseDto {
  id: number;
  topup_id: string;
  used_coins: number;
  donation_id?: string;
  used_at: Date;
}

export class UsageStatsResponseDto {
  total_usage_count: number;
  total_coins_used: number;
}
