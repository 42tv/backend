import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class UseCoinDto {
  @IsNumber()
  @Min(1, { message: '사용할 코인은 1개 이상이어야 합니다.' })
  @Max(1000000, {
    message: '한번에 사용할 수 있는 코인은 1,000,000개까지입니다.',
  })
  amount: number;

  @IsOptional()
  @IsString()
  donation_id?: string;
}
