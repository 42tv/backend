import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AdminAuditLogModule } from 'src/admin-audit-log/admin-audit-log.module';
import { AdminTermsController } from './admin-terms.controller';

@Module({
  imports: [PrismaModule, AdminAuditLogModule],
  controllers: [AdminTermsController],
})
export class TermsModule {}
