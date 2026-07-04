import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AdminAuditLogRepository } from './admin-audit-log.repository';
import { AdminAuditLogService } from './admin-audit-log.service';
import { AdminAuditLogController } from './admin-audit-log.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AdminAuditLogController],
  providers: [AdminAuditLogService, AdminAuditLogRepository],
  exports: [AdminAuditLogService],
})
export class AdminAuditLogModule {}
