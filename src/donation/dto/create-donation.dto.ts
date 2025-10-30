import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDonationDto {
  @IsNumber()
  coin_amount: number;

  @IsString()
  streamer_user_id: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  message?: string;
}
