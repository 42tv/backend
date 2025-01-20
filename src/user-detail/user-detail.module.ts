import { Module } from '@nestjs/common';
import { UserDetailService } from './user-detail.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  exports: [UserDetailService],
  providers: [UserDetailService],
})
export class UserDetailModule {}
