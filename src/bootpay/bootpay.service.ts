import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bootpay } from '@bootpay/backend-js';

@Injectable()
export class BootpayService implements OnModuleInit {
  private readonly logger = new Logger(BootpayService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const applicationId = this.configService.get<string>(
      'BOOTPAY_APPLICATION_ID',
    );
    const privateKey = this.configService.get<string>('BOOTPAY_PRIVATE_KEY');

    if (!applicationId || !privateKey) {
      this.logger.warn(
        'Bootpay credentials not configured. Using sandbox defaults.',
      );
      // Sandbox test credentials
      Bootpay.setConfiguration({
        application_id: '5b8f6a4d396fa665fdc2b5e7',
        private_key: 'rm6EYECr6aroQVG2ntW0A6LpWnkTgP4uQ3H/+boffG0=',
      });
    } else {
      Bootpay.setConfiguration({
        application_id: applicationId,
        private_key: privateKey,
      });
    }

    this.logger.log('Bootpay initialized successfully');
  }

  async verifyPayment(receiptId: string) {
    try {
      await Bootpay.getAccessToken();
      const response = await Bootpay.receiptPayment(receiptId);
      this.logger.log(`Payment verified: ${receiptId}`);
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      this.logger.error(
        `Payment verification failed: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async cancelPayment(
    receiptId: string,
    cancelPrice?: number,
    cancelUsername?: string,
    cancelMessage?: string,
  ) {
    try {
      await Bootpay.getAccessToken();

      const cancelData: any = {
        receipt_id: receiptId,
        cancel_username: cancelUsername || 'Admin',
        cancel_message: cancelMessage || 'User requested cancellation',
      };

      if (cancelPrice) {
        cancelData.cancel_price = cancelPrice;
      }

      const response = await Bootpay.cancelPayment(cancelData);
      this.logger.log(`Payment cancelled: ${receiptId}`);
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      this.logger.error(
        `Payment cancellation failed: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getPaymentStatus(receiptId: string) {
    try {
      await Bootpay.getAccessToken();
      const response = await Bootpay.receiptPayment(receiptId);
      return {
        success: true,
        status: (response as any).data?.status || (response as any).status,
        data: response,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get payment status: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
