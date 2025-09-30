export class WalletBalanceResponseDto {
  user_idx: number;
  balance: number;
  created_at: Date;
  updated_at: Date;
}

export class WalletStatsResponseDto {
  total_users: number;
  total_balance: number;
  average_balance: number;
}
