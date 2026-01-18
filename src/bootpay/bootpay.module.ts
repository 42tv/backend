import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BootpayController } from './bootpay.controller';
import { BootpayService } from './bootpay.service';

@Module({
  imports: [ConfigModule],
  controllers: [BootpayController],
  providers: [BootpayService],
  exports: [BootpayService],
})
export class BootpayModule {}
