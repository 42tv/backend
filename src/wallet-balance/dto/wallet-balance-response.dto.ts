export class WalletBalanceResponseDto {
  user_idx: number;
  coin_balance: number;
  updated_at: Date;
}

export class WalletStatsResponseDto {
  total_users: number;
  total_balance: number;
  average_balance: number;
}
