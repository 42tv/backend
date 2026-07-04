import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RealtimeRedisModule } from 'src/redis/redis.module';
import { StreamModule } from 'src/stream/stream.module';
import { UserModule } from 'src/user/user.module';
import { AdminAuditLogModule } from 'src/admin-audit-log/admin-audit-log.module';
import { SanctionRepository } from './sanction.repository';
import { SanctionService } from './sanction.service';
import { AdminSanctionController } from './admin-sanction.controller';

@Module({
  imports: [
    PrismaModule,
    RealtimeRedisModule,
    StreamModule,
    UserModule,
    AdminAuditLogModule,
  ],
  controllers: [AdminSanctionController],
  providers: [SanctionService, SanctionRepository],
  exports: [SanctionService, SanctionRepository],
})
export class SanctionModule {}
