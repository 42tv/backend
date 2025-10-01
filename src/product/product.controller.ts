import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdminGuard } from '../auth/guard/admin.guard';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @UseGuards(AdminGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  @UseInterceptors(
    FileInterceptor('image', {
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 1024 * 1024 * 5, // 5MB
      },
    }),
  )
  create(
    @UploadedFile() file: Express.Multer.File,
    @Body() createProductDto: CreateProductDto,
  ) {
    return this.productService.createWithImage(createProductDto, file);
  }

  @Get()
  findAll() {
    return this.productService.findActiveProducts();
  }

  @Get('all')
  @UseGuards(AdminGuard)
  findAllForAdmin() {
    return this.productService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findById(id);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productService.update(id, updateProductDto);
  }

  @Patch(':id/activate')
  @UseGuards(AdminGuard)
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.productService.activate(id);
  }

  @Patch(':id/deactivate')
  @UseGuards(AdminGuard)
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.productService.deactivate(id);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productService.remove(id);
  }
}
