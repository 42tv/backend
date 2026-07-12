import { IsNotEmpty, IsString } from 'class-validator';

export class RefundTopupDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
