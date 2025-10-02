import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ProductRepository } from './product.repository';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AwsService } from '../aws/aws.service';
import * as sharp from 'sharp';

@Injectable()
export class ProductService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly awsService: AwsService,
  ) {}

  /**
   * 이미지를 포함한 상품 생성
   * @param createProductDto 상품 생성 데이터
   * @param file 업로드할 이미지 파일 (선택사항)
   * @returns 생성된 상품
   */
  async createWithImage(
    createProductDto: CreateProductDto,
    file?: Express.Multer.File,
  ) {
    let imageUrl: string | undefined;
    let s3Key: string | undefined;

    try {
      // 1. 이미지가 있으면 먼저 S3에 업로드
      if (file) {
        const uploadResult = await this.uploadImageToS3(file);
        imageUrl = uploadResult.imageUrl;
        s3Key = uploadResult.s3Key;
      }

      // 2. 상품명 중복 체크
      const existingProduct = await this.productRepository.findByName(
        createProductDto.name,
      );
      if (existingProduct && existingProduct.is_active) {
        // 중복 발견 시 업로드한 이미지 삭제 (롤백)
        if (s3Key) {
          await this.awsService.deleteFromS3(s3Key);
        }
        throw new BadRequestException('이미 존재하는 상품명입니다.');
      }

      // 3. 상품 생성 (이미지 URL 포함)
      const productData = {
        ...createProductDto,
        image_url: imageUrl,
      };

      return await this.productRepository.create(productData);
    } catch (error) {
      // 에러 발생 시 업로드한 이미지 삭제 (롤백)
      if (s3Key) {
        try {
          await this.awsService.deleteFromS3(s3Key);
          console.log(`롤백: S3 이미지 삭제 완료 - ${s3Key}`);
        } catch (deleteError) {
          console.error('S3 이미지 삭제 실패:', deleteError);
        }
      }
      throw error;
    }
  }

  /**
   * 이미지를 S3에 업로드 (private 메서드)
   * @param file 업로드할 이미지 파일
   * @returns S3 키와 CDN URL
   */
  private async uploadImageToS3(
    file: Express.Multer.File,
  ): Promise<{ s3Key: string; imageUrl: string }> {
    // 파일 형식 검증
    if (
      !file.mimetype.endsWith('jpeg') &&
      !file.mimetype.endsWith('png') &&
      !file.mimetype.endsWith('jpg') &&
      !file.mimetype.endsWith('webp')
    ) {
      throw new BadRequestException(
        'jpeg, png, jpg, webp 파일만 업로드 가능합니다',
      );
    }

    // 파일 크기 검증
    if (file.size > 1024 * 1024 * 5) {
      throw new BadRequestException(
        '파일 사이즈는 5MB 이하로 업로드 가능합니다',
      );
    }

    try {
      // 이미지 리사이징 (최대 800px, 원본 비율 유지)
      const buffer = await sharp(file.buffer)
        .resize(800, 800, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toBuffer();

      // 고유 파일명 생성: products/YYYYMMDD-HHMMSS-randomId.jpg
      const timestamp = new Date()
        .toISOString()
        .replace(/[-:]/g, '')
        .replace('T', '-')
        .substring(0, 15);

      const randomId = Math.random().toString(36).substring(2, 8);
      const s3Key = `products/${timestamp}-${randomId}.jpg`;

      // S3에 업로드
      await this.awsService.uploadToS3(s3Key, buffer, 'image/jpeg');

      // CDN URL 생성
      const imageUrl = `${process.env.CDN_URL}/${s3Key}`;

      console.log(`상품 이미지 업로드 완료: ${s3Key}`);
      return { s3Key, imageUrl };
    } catch (error) {
      console.error('상품 이미지 S3 업로드 실패:', error);
      throw new InternalServerErrorException('이미지 업로드에 실패했습니다');
    }
  }

  /**
   * 활성화된 상품 목록 조회 (사용자용)
   * @returns 활성화된 상품 목록
   */
  async findActiveProducts() {
    const products = await this.productRepository.findActiveProducts();
    return { products };
  }

  /**
   * 모든 상품 목록 조회 (관리자용)
   * @returns 모든 상품 목록
   */
  async findAll() {
    const products = await this.productRepository.findAll();
    return { products };
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
