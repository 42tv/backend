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
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';

const imageInterceptor = FileInterceptor('image', {
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 * 5 },
});

@Controller('admin/product')
@UseGuards(AdminGuard)
export class AdminProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  @UseInterceptors(imageInterceptor)
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() createProductDto: CreateProductDto,
  ): Promise<SuccessResponseDto<{ product: any }>> {
    const product = await this.productService.createWithImage(
      createProductDto,
      file,
    );
    return ResponseWrapper.success(
      { product },
      '상품을 성공적으로 생성했습니다.',
    );
  }

  @Get()
  async findAll(): Promise<SuccessResponseDto<any>> {
    const products = await this.productService.findAll();
    return ResponseWrapper.success(products, '전체 상품 목록을 조회했습니다.');
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ transform: true }))
  @UseInterceptors(imageInterceptor)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<SuccessResponseDto<any>> {
    const product = await this.productService.updateWithImage(
      id,
      updateProductDto,
      file,
    );
    return ResponseWrapper.success(product, '상품 정보를 수정했습니다.');
  }

  @Patch(':id/activate')
  async activate(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SuccessResponseDto<any>> {
    const product = await this.productService.activate(id);
    return ResponseWrapper.success(product, '상품을 활성화했습니다.');
  }

  @Patch(':id/deactivate')
  async deactivate(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SuccessResponseDto<any>> {
    const product = await this.productService.deactivate(id);
    return ResponseWrapper.success(product, '상품을 비활성화했습니다.');
  }

  @Delete(':id')
  async delete(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SuccessResponseDto<null>> {
    await this.productService.delete(id);
    return ResponseWrapper.success(null, '상품을 삭제했습니다.');
  }
}
