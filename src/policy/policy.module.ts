import { Module } from '@nestjs/common';
import { PolicyController } from './policy.controller';
import { PolicyService } from './policy.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [PolicyController],
  providers: [PolicyService, PrismaService],
})
export class PolicyModule {}
