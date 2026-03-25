import { Module } from '@nestjs/common';
import { WidgetController } from './widget.controller';
import { WidgetService } from './widget.service';
import { WidgetRepository } from './widget.repository';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WidgetController],
  providers: [WidgetService, WidgetRepository],
  exports: [WidgetService],
})
export class WidgetModule {}
