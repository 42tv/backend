import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AwsModule } from 'src/aws/aws.module';
import { AdminAuditLogModule } from 'src/admin-audit-log/admin-audit-log.module';
import { InquiryRepository } from './inquiry.repository';
import { InquiryService } from './inquiry.service';
import { InquiryController } from './inquiry.controller';
import { AdminInquiryController } from './admin-inquiry.controller';

@Module({
  imports: [PrismaModule, AwsModule, AdminAuditLogModule],
  controllers: [InquiryController, AdminInquiryController],
  providers: [InquiryService, InquiryRepository],
  exports: [InquiryService],
})
export class InquiryModule {}
