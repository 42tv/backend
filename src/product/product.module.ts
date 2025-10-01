import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { ProductRepository } from './product.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { AwsModule } from '../aws/aws.module';

@Module({
  imports: [PrismaModule, AwsModule],
  controllers: [ProductController],
  providers: [ProductService, ProductRepository],
  exports: [ProductService, ProductRepository],
})
export class ProductModule {}
