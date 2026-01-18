import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CancelPaymentDto {
  @ApiProperty({
    description: 'Receipt ID from bootpay',
    example: '64a1b2c3d4e5f6g7h8i9j0k1',
  })
  @IsString()
  @IsNotEmpty()
  receiptId: string;

  @ApiPropertyOptional({
    description: 'Amount to cancel (omit for full refund)',
    example: 1000,
  })
  @IsNumber()
  @IsOptional()
  cancelPrice?: number;

  @ApiPropertyOptional({
    description: 'Username requesting cancellation',
    example: 'Admin',
  })
  @IsString()
  @IsOptional()
  cancelUsername?: string;

  @ApiPropertyOptional({
    description: 'Reason for cancellation',
    example: 'Customer requested refund',
  })
  @IsString()
  @IsOptional()
  cancelMessage?: string;
}
