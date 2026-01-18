import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyPaymentDto {
  @ApiProperty({
    description: 'Receipt ID from bootpay',
    example: '64a1b2c3d4e5f6g7h8i9j0k1',
  })
  @IsString()
  @IsNotEmpty()
  receiptId: string;
}
