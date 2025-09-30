import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { PaymentTransactionService } from './payment-transaction.service';
import { CreatePaymentTransactionDto } from './dto/create-payment-transaction.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { MemberGuard } from '../auth/guard/jwt.member.guard';
import { GetUser } from '../auth/get-user.decorator';

@Controller('payment-transactions')
export class PaymentTransactionController {
  constructor(
    private readonly paymentTransactionService: PaymentTransactionService,
  ) {}

  @Post()
  @UseGuards(MemberGuard)
  async create(
    @GetUser() user: { user_idx: number },
    @Body() createDto: CreatePaymentTransactionDto,
  ) {
    return await this.paymentTransactionService.create(
      user.user_idx,
      createDto,
    );
  }

  @Post('success')
  async processSuccessfulPayment(
    @Body('pg_transaction_id') pg_transaction_id: string,
    @Body('product_id', ParseIntPipe) product_id: number,
    @Body('pg_response') pg_response?: any,
  ) {
    return await this.paymentTransactionService.processSuccessfulPayment(
      pg_transaction_id,
      product_id,
      pg_response,
    );
  }

  @Post('approve')
  async approvePayment(@Body() updateDto: UpdatePaymentStatusDto) {
    return await this.paymentTransactionService.approvePayment(
      updateDto.pg_transaction_id,
      updateDto.pg_response,
    );
  }

  @Post('fail')
  async failPayment(@Body() updateDto: UpdatePaymentStatusDto) {
    return await this.paymentTransactionService.failPayment(
      updateDto.pg_transaction_id,
      updateDto.pg_response,
    );
  }

  @Post('cancel')
  async cancelPayment(@Body() updateDto: UpdatePaymentStatusDto) {
    return await this.paymentTransactionService.cancelPayment(
      updateDto.pg_transaction_id,
      updateDto.pg_response,
    );
  }

  @Get('pg/:pg_transaction_id')
  async findByPgTransactionId(
    @Param('pg_transaction_id') pg_transaction_id: string,
  ) {
    return await this.paymentTransactionService.findByPgTransactionId(
      pg_transaction_id,
    );
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return await this.paymentTransactionService.findById(id);
  }

  @Get('user/me')
  @UseGuards(MemberGuard)
  async getMyTransactions(
    @GetUser() user: { user_idx: number },
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return await this.paymentTransactionService.findByUserId(
      user.user_idx,
      limit,
    );
  }
}