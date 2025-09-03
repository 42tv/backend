import { forwardRef, Module } from '@nestjs/common';
import { ArticleService } from './article.service';
import { ArticleController } from './article.controller';
import { ArticleRepository } from './article.repository';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AwsModule } from 'src/aws/aws.module';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [PrismaModule, AwsModule, forwardRef(() => UserModule)],
  controllers: [ArticleController],
  providers: [ArticleService, ArticleRepository],
  exports: [ArticleService, ArticleRepository],
})
export class ArticleModule {}
