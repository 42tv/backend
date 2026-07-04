import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RealtimeRedisModule } from 'src/redis/redis.module';
import { AdminAuditLogModule } from 'src/admin-audit-log/admin-audit-log.module';
import { BannedWordRepository } from './banned-word.repository';
import { BannedWordService } from './banned-word.service';
import { AdminBannedWordController } from './admin-banned-word.controller';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => RealtimeRedisModule),
    AdminAuditLogModule,
  ],
  controllers: [AdminBannedWordController],
  providers: [BannedWordService, BannedWordRepository],
  exports: [BannedWordService],
})
export class BannedWordModule {}
