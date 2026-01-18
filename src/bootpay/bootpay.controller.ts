import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BootpayService } from './bootpay.service';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { CancelPaymentDto } from './dto/cancel-payment.dto';

@ApiTags('Bootpay')
@Controller('bootpay')
export class BootpayController {
  constructor(private readonly bootpayService: BootpayService) {}

  @Post('verify')
  @ApiOperation({ summary: 'Verify payment' })
  @ApiResponse({ status: 200, description: 'Payment verified successfully' })
  @ApiResponse({ status: 400, description: 'Payment verification failed' })
  async verifyPayment(@Body() dto: VerifyPaymentDto) {
    return this.bootpayService.verifyPayment(dto.receiptId);
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancel payment (full or partial refund)' })
  @ApiResponse({ status: 200, description: 'Payment cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Payment cancellation failed' })
  async cancelPayment(@Body() dto: CancelPaymentDto) {
    return this.bootpayService.cancelPayment(
      dto.receiptId,
      dto.cancelPrice,
      dto.cancelUsername,
      dto.cancelMessage,
    );
  }

  @Get('status/:receiptId')
  @ApiOperation({ summary: 'Get payment status' })
  @ApiResponse({
    status: 200,
    description: 'Payment status retrieved successfully',
  })
  @ApiResponse({ status: 400, description: 'Failed to get payment status' })
  async getPaymentStatus(@Param('receiptId') receiptId: string) {
    return this.bootpayService.getPaymentStatus(receiptId);
  }
}
