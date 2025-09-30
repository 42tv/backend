import { TopupStatus } from '@prisma/client';

export class TopupResponseDto {
  id: string;
  transaction_id: string;
  user_idx: number;
  product_id: number;
  product_name: string;
  base_coins: number;
  bonus_coins: number;
  total_coins: number;
  paid_amount: number;
  coin_unit_price: number;
  status: TopupStatus;
  topped_up_at: Date;
}

export class TopupStatsResponseDto {
  total_topup_count: number;
  total_coins_purchased: number;
  total_amount_paid: number;
}

export class AvailableTopupResponseDto {
  id: string;
  total_coins: number;
  topped_up_at: Date;
  remaining_coins: number;
}
