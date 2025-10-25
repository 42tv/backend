export class WalletBalanceResponseDto {
  user_idx: number;
  coin_balance: number;
  total_charged: number;
  total_used: number;
  total_received: number;
  created_at: Date;
  updated_at: Date;
}

export class WalletStatsResponseDto {
  total_users: number;
  total_balance: number;
  total_charged: number;
  total_used: number;
  total_received: number;
  average_balance: number;
}
