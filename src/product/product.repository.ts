import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 상품 생성
   * @param createProductDto 상품 생성 데이터
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 생성된 상품
   */
  async create(
    createProductDto: CreateProductDto,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;

    const total_coins =
      createProductDto.base_coins + (createProductDto.bonus_coins || 0);

    return await prismaClient.product.create({
      data: {
        name: createProductDto.name,
        description: createProductDto.description,
        base_coins: createProductDto.base_coins,
        bonus_coins: createProductDto.bonus_coins || 0,
        total_coins,
        price: createProductDto.price,
        is_active: createProductDto.is_active ?? true,
        sort_order: createProductDto.sort_order || 0,
      },
    });
  }

  /**
   * 모든 활성화된 상품 조회 (정렬 순서대로)
   * @returns 상품 목록
   */
  async findActiveProducts() {
    return await this.prisma.product.findMany({
      where: {
        is_active: true,
      },
      orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
    });
  }

  /**
   * 모든 상품 조회 (관리자용)
   * @returns 모든 상품 목록
   */
  async findAll() {
    return await this.prisma.product.findMany({
      orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
    });
  }

  /**
   * 상품 조회 (ID로)
   * @param id 상품 ID
   * @returns 상품 정보
   */
  async findById(id: number) {
    return await this.prisma.product.findUnique({
      where: { id },
    });
  }

  /**
   * 상품명으로 조회
   * @param name 상품명
   * @returns 상품 정보
   */
  async findByName(name: string) {
    return await this.prisma.product.findFirst({
      where: { name },
    });
  }

  /**
   * 상품 수정
   * @param id 상품 ID
   * @param updateProductDto 수정 데이터
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 수정된 상품
   */
  async update(
    id: number,
    updateProductDto: UpdateProductDto,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;

    const updateData: any = { ...updateProductDto };

    // base_coins나 bonus_coins가 변경되면 total_coins도 재계산
    if (
      updateProductDto.base_coins !== undefined ||
      updateProductDto.bonus_coins !== undefined
    ) {
      const currentProduct = await this.findById(id);
      if (currentProduct) {
        const base_coins =
          updateProductDto.base_coins ?? currentProduct.base_coins;
        const bonus_coins =
          updateProductDto.bonus_coins ?? currentProduct.bonus_coins;
        updateData.total_coins = base_coins + bonus_coins;
      }
    }

    return await prismaClient.product.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * 상품 삭제 (소프트 삭제 - 비활성화)
   * @param id 상품 ID
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 비활성화된 상품
   */
  async delete(id: number, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;

    return await prismaClient.product.update({
      where: { id },
      data: { is_active: false },
    });
  }
}
