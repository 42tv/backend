import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserModule } from 'src/user/user.module';
import { SanctionModule } from 'src/sanction/sanction.module';
import { LiveModule } from 'src/live/live.module';
import { AdminAuditLogModule } from 'src/admin-audit-log/admin-audit-log.module';
import { StreamModule } from 'src/stream/stream.module';
import { AwsModule } from 'src/aws/aws.module';
import { ReportRepository } from './report.repository';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { AdminReportController } from './admin-report.controller';

@Module({
  imports: [
    PrismaModule,
    UserModule,
    SanctionModule,
    LiveModule,
    AdminAuditLogModule,
    StreamModule,
    AwsModule,
  ],
  controllers: [ReportController, AdminReportController],
  providers: [ReportService, ReportRepository],
  exports: [ReportService],
})
export class ReportModule {}
