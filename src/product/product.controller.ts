import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ProductService } from './product.service';
import { SuccessResponseDto } from 'src/common/dto/success-response.dto';
import { ResponseWrapper } from 'src/common/utils/response-wrapper.util';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  async findAll(): Promise<SuccessResponseDto<any>> {
    const products = await this.productService.findActiveProducts();
    return ResponseWrapper.success(
      products,
      '활성화된 상품 목록을 조회했습니다.',
    );
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SuccessResponseDto<any>> {
    const product = await this.productService.findById(id);
    return ResponseWrapper.success(product, '상품 정보를 조회했습니다.');
  }
}
