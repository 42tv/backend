import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentTransactionDto } from './dto/create-payment-transaction.dto';
import { Prisma, PaymentTransactionStatus } from '@prisma/client';

@Injectable()
export class PaymentTransactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 결제 거래 생성 (PENDING 상태로 시작)
   * @param user_idx 결제자 ID
   * @param createDto 결제 거래 생성 데이터
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 생성된 결제 거래
   */
  async create(
    user_idx: number,
    createDto: CreatePaymentTransactionDto,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;

    return await prismaClient.paymentTransaction.create({
      data: {
        user_idx,
        pg_provider: createDto.pg_provider,
        pg_transaction_id: createDto.pg_transaction_id,
        payment_method: createDto.payment_method,
        amount: createDto.amount,
        currency: createDto.currency || 'KRW',
        status: PaymentTransactionStatus.PENDING,
        pg_response: createDto.pg_response,
      },
    });
  }

  /**
   * PG사 거래 ID로 결제 거래 조회
   * @param pg_transaction_id PG사 거래 고유번호
   * @returns 결제 거래 또는 null
   */
  async findByPgTransactionId(pg_transaction_id: string) {
    return await this.prisma.paymentTransaction.findUnique({
      where: { pg_transaction_id },
      include: {
        user: true,
        topups: true,
      },
    });
  }

  /**
   * ID로 결제 거래 조회
   * @param id 결제 거래 ID
   * @returns 결제 거래 또는 null
   */
  async findById(id: string) {
    return await this.prisma.paymentTransaction.findUnique({
      where: { id },
      include: {
        user: true,
        topups: true,
      },
    });
  }

  /**
   * 사용자의 결제 거래 목록 조회
   * @param user_idx 사용자 ID
   * @param limit 조회 제한 수
   * @returns 결제 거래 목록
   */
  async findByUserId(user_idx: number, limit: number = 20) {
    return await this.prisma.paymentTransaction.findMany({
      where: { user_idx },
      orderBy: { requested_at: 'desc' },
      take: limit,
      include: {
        topups: true,
      },
    });
  }

  /**
   * 결제 상태 업데이트
   * @param id 결제 거래 ID
   * @param status 새로운 상태
   * @param pg_response PG사 응답 데이터 (선택사항)
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 업데이트된 결제 거래
   */
  async updateStatus(
    id: string,
    status: PaymentTransactionStatus,
    pg_response?: any,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;

    const updateData: any = {
      status,
    };

    if (status === PaymentTransactionStatus.SUCCESS) {
      updateData.approved_at = new Date();
    } else if (status === PaymentTransactionStatus.CANCELED) {
      updateData.canceled_at = new Date();
    }

    if (pg_response) {
      updateData.pg_response = pg_response;
    }

    return await prismaClient.paymentTransaction.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * 5년 보관을 위한 사용자 스냅샷 저장 (사용자 삭제 시)
   * @param transaction_id 결제 거래 ID
   * @param user_snapshot 사용자 정보 스냅샷
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns 업데이트된 결제 거래
   */
  async saveUserSnapshot(
    transaction_id: string,
    user_snapshot: any,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;

    const fiveYearsLater = new Date();
    fiveYearsLater.setFullYear(fiveYearsLater.getFullYear() + 5);

    return await prismaClient.paymentTransaction.update({
      where: { id: transaction_id },
      data: {
        deleted_user_snapshot: user_snapshot,
        user_deleted_at: new Date(),
        should_delete_at: fiveYearsLater,
      },
    });
  }

  /**
   * 5년이 지난 결제 거래 조회 (정리 작업용)
   * @returns 삭제 가능한 결제 거래 목록
   */
  async findExpiredTransactions() {
    const now = new Date();
    return await this.prisma.paymentTransaction.findMany({
      where: {
        should_delete_at: {
          lte: now,
        },
      },
    });
  }
}
