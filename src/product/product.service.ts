import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ProductRepository } from './product.repository';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
  constructor(private readonly productRepository: ProductRepository) {}

  /**
   * 상품 생성
   * @param createProductDto 상품 생성 데이터
   * @returns 생성된 상품
   */
  async create(createProductDto: CreateProductDto) {
    // 상품명 중복 체크
    const existingProduct = await this.productRepository.findByName(
      createProductDto.name,
    );
    if (existingProduct && existingProduct.is_active) {
      throw new BadRequestException('이미 존재하는 상품명입니다.');
    }

    return await this.productRepository.create(createProductDto);
  }

  /**
   * 활성화된 상품 목록 조회 (사용자용)
   * @returns 활성화된 상품 목록
   */
  async findActiveProducts() {
    return await this.productRepository.findActiveProducts();
  }

  /**
   * 모든 상품 목록 조회 (관리자용)
   * @returns 모든 상품 목록
   */
  async findAll() {
    return await this.productRepository.findAll();
  }

  /**
   * 상품 상세 조회
   * @param id 상품 ID
   * @returns 상품 정보
   */
  async findById(id: number) {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException('존재하지 않는 상품입니다.');
    }
    return product;
  }

  /**
   * 활성화된 상품 조회 (충전 시 사용)
   * @param id 상품 ID
   * @returns 활성화된 상품 정보
   */
  async findActiveProduct(id: number) {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException('존재하지 않는 상품입니다.');
    }
    if (!product.is_active) {
      throw new NotFoundException('비활성화된 상품입니다.');
    }
    return product;
  }

  /**
   * 상품 수정
   * @param id 상품 ID
   * @param updateProductDto 수정 데이터
   * @returns 수정된 상품
   */
  async update(id: number, updateProductDto: UpdateProductDto) {
    const existingProduct = await this.findById(id);

    // 상품명 중복 체크 (다른 상품과 중복되는지)
    if (
      updateProductDto.name &&
      updateProductDto.name !== existingProduct.name
    ) {
      const duplicateProduct = await this.productRepository.findByName(
        updateProductDto.name,
      );
      if (
        duplicateProduct &&
        duplicateProduct.id !== id &&
        duplicateProduct.is_active
      ) {
        throw new BadRequestException('이미 존재하는 상품명입니다.');
      }
    }

    return await this.productRepository.update(id, updateProductDto);
  }

  /**
   * 상품 활성화
   * @param id 상품 ID
   * @returns 활성화된 상품
   */
  async activate(id: number) {
    await this.findById(id);
    return await this.productRepository.update(id, { is_active: true });
  }

  /**
   * 상품 비활성화
   * @param id 상품 ID
   * @returns 비활성화된 상품
   */
  async deactivate(id: number) {
    await this.findById(id);
    return await this.productRepository.update(id, { is_active: false });
  }

  /**
   * 상품 삭제 (소프트 삭제)
   * @param id 상품 ID
   * @returns 삭제된 상품
   */
  async delete(id: number) {
    await this.findById(id);
    return await this.productRepository.delete(id);
  }

  /**
   * 상품 물리 삭제 (관리자 전용 - 구매 기록이 없는 경우만)
   * @param id 상품 ID
   * @returns 삭제 결과
   */
  async remove(id: number) {
    await this.findById(id);

    // TODO: 구매 기록이 있는지 확인 (CoinTopup 테이블 체크)
    // 구매 기록이 있으면 물리 삭제 불가

    // 현재는 소프트 삭제로 대체
    return await this.productRepository.delete(id);
  }
}
