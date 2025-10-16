import { IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';

export enum PgProvider {
  INICIS = 'inicis',
  TOSS = 'toss',
  KAKAOPAY = 'kakaopay',
  MOCK = 'mock', // 개발/테스트용
}

export enum PaymentMethod {
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  MOBILE = 'mobile',
  MOCK = 'mock', // 개발/테스트용
}

export class CreatePaymentTransactionDto {
  @IsEnum(PgProvider)
  pg_provider: PgProvider;

  @IsString()
  pg_transaction_id: string;

  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  pg_response?: any;
}
