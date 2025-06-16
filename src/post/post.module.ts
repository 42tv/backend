import { forwardRef, Module } from '@nestjs/common';
import { PostService } from './post.service';
import { PostController } from './post.controller';
import { PostRepository } from './post.repository';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserModule } from 'src/user/user.module';
import { FanModule } from 'src/fan/fan.module';
import { FanLevelModule } from 'src/fan-level/fan-level.module';

@Module({
  imports: [PrismaModule, forwardRef(() => UserModule), FanModule, FanLevelModule],
  controllers: [PostController],
  providers: [PostService, PostRepository],
  exports: [PostService],
})
export class PostModule {}
