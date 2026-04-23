import { Module } from '@nestjs/common';
import { PolicyController } from './policy.controller';
import { AdminPolicyController } from './admin-policy.controller';
import { PolicyService } from './policy.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [PolicyController, AdminPolicyController],
  providers: [PolicyService, PrismaService],
})
export class PolicyModule {}
