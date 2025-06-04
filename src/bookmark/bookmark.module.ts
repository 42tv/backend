import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BookmarkService } from './bookmark.service';
import { BookmarkRepository } from './bookmark.repository';

@Module({
  imports: [PrismaModule],
  controllers: [],
  providers: [BookmarkService, BookmarkRepository],
  exports: [BookmarkService],
})
export class BookmarkModule {}
