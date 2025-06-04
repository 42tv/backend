import { Module } from '@nestjs/common';
import { BlacklistService } from './blacklist.service';
import { BlacklistRepository } from './blacklist.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [BlacklistService, BlacklistRepository],
  exports: [BlacklistService],
})
export class BlacklistModule {}
