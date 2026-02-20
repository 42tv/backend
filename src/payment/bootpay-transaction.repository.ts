import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  ReceiptResponseParameters,
  CardData,
  BankData,
} from '@bootpay/backend-js';

/**
 * Bootpay 트랜잭션 저장을 위한 DTO
 */
export interface CreateBootpayTransactionDto {
  user_idx: number;
  receipt_id: string;
  order_id: string;
  application_id: string;
  price: number;
  tax_free?: number;
  cancelled_price?: number;
  cancelled_tax_free?: number;
  currency?: string;
  order_name: string;
  company_name?: string;
  pg: string;
  method: string;
  method_symbol: string;
  method_origin?: string;
  method_origin_symbol?: string;
  status: number;
  status_locale?: string;
  escrow_status?: string;
  escrow_status_locale?: string;
  requested_at: Date;
  purchased_at?: Date;
  cancelled_at?: Date;
  gateway_url?: string;
  receipt_url?: string;
  metadata?: any;
  sandbox?: boolean;
  raw_response: any;
}

/**
 * Bootpay 카드 데이터 저장을 위한 DTO
 */
export interface CreateBootpayCardDataDto {
  transaction_id: string;
  tid: string;
  card_approve_no: string;
  card_no: string;
  card_company_code: string;
  card_company: string;
  card_type: string;
  card_quota: string;
  card_interest: string;
  receipt_url?: string;
}

/**
 * Bootpay 가상계좌 데이터 저장을 위한 DTO
 */
export interface CreateBootpayVbankDataDto {
  transaction_id: string;
  tid: string;
  bank_name: string;
  bank_username?: string;
  bank_account?: string;
  sender_name?: string;
  expired_at?: Date;
  cash_receipt_tid?: string;
  cash_receipt_type?: string;
  cash_receipt_no?: string;
  receipt_url?: string;
}

/**
 * Bootpay 간편결제 데이터 저장을 위한 DTO
 */
export interface CreateBootpayEasyDataDto {
  transaction_id: string;
  tid?: string;
  method_origin?: string;
  method_origin_symbol?: string;
  raw_data?: any;
}

@Injectable()
export class BootpayTransactionRepository {
  private readonly logger = new Logger(BootpayTransactionRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Bootpay Receipt 응답을 DTO로 변환
   * @param receiptData Bootpay Receipt 응답
   * @param user_idx 사용자 ID
   * @param application_id Bootpay 앱 ID
   * @returns CreateBootpayTransactionDto
   */
  static fromReceiptResponse(
    receiptData: ReceiptResponseParameters,
    user_idx: number,
    application_id: string,
  ): CreateBootpayTransactionDto {
    return {
      user_idx,
      receipt_id: receiptData.receipt_id,
      order_id: receiptData.order_id,
      application_id,
      price: receiptData.price,
      tax_free: receiptData.tax_free || 0,
      cancelled_price: receiptData.cancelled_price || 0,
      cancelled_tax_free: receiptData.cancelled_tax_free || 0,
      currency: receiptData.currency || 'KRW',
      order_name: receiptData.order_name,
      company_name: receiptData.company_name || null,
      pg: receiptData.pg,
      method: receiptData.method,
      method_symbol: receiptData.method_symbol,
      method_origin: receiptData.method_origin || null,
      method_origin_symbol: receiptData.method_origin_symbol || null,
      status: receiptData.status,
      status_locale: receiptData.status_locale || null,
      escrow_status: null,
      escrow_status_locale: null,
      requested_at: new Date(receiptData.requested_at),
      purchased_at: receiptData.purchased_at
        ? new Date(receiptData.purchased_at)
        : null,
      cancelled_at: receiptData.cancelled_at
        ? new Date(receiptData.cancelled_at)
        : null,
      gateway_url: receiptData.gateway_url || null,
      receipt_url: receiptData.receipt_url || null,
      metadata:
        typeof receiptData.metadata === 'string'
          ? JSON.parse(receiptData.metadata || '{}')
          : receiptData.metadata || {},
      sandbox: receiptData.sandbox || false,
      raw_response: receiptData,
    };
  }

  /**
   * Bootpay CardData를 DTO로 변환
   * @param cardData Bootpay CardData
   * @param transaction_id BootpayTransaction ID
   * @returns CreateBootpayCardDataDto
   */
  static fromCardData(
    cardData: CardData,
    transaction_id: string,
  ): CreateBootpayCardDataDto {
    return {
      transaction_id,
      tid: cardData.tid,
      card_approve_no: cardData.card_approve_no,
      card_no: cardData.card_no,
      card_company_code: cardData.card_company_code,
      card_company: cardData.card_company,
      card_type: cardData.card_type || 'unknown',
      card_quota: cardData.card_quota,
      card_interest: cardData.card_interest,
      receipt_url: cardData.receipt_url || null,
    };
  }

  /**
   * Bootpay BankData(vbank_data)를 DTO로 변환
   */
  static fromVbankData(
    vbankData: BankData,
    transaction_id: string,
  ): CreateBootpayVbankDataDto {
    return {
      transaction_id,
      tid: vbankData.tid,
      bank_name: vbankData.bank_name,
      bank_username: vbankData.bank_username || null,
      bank_account: vbankData.bank_account || null,
      sender_name: vbankData.sender_name || null,
      expired_at: vbankData.expired_at ? new Date(vbankData.expired_at) : null,
      cash_receipt_tid: vbankData.cash_receipt_tid || null,
      cash_receipt_type: vbankData.cash_receipt_type || null,
      cash_receipt_no: vbankData.cash_receipt_no || null,
      receipt_url: vbankData.receipt_url || null,
    };
  }

  /**
   * 간편결제 데이터를 DTO로 변환
   * SDK에 별도 easy_data 타입이 없으므로 Receipt에서 추출
   */
  static fromEasyData(
    receiptData: ReceiptResponseParameters,
    transaction_id: string,
  ): CreateBootpayEasyDataDto {
    // 간편결제 관련 포인트/머니 데이터 수집
    const rawData: any = {};
    const kakaoMoneyData =
      receiptData.kakao_moneny_data ||
      (receiptData as any).kakao_money_data ||
      null;
    if (kakaoMoneyData) rawData.kakao_money = kakaoMoneyData;
    if (receiptData.naver_point_data)
      rawData.naver_point = receiptData.naver_point_data;
    if (receiptData.payco_point_data)
      rawData.payco_point = receiptData.payco_point_data;
    if (receiptData.toss_point_data)
      rawData.toss_point = receiptData.toss_point_data;

    return {
      transaction_id,
      tid:
        rawData.kakao_money?.tid ||
        rawData.naver_point?.tid ||
        rawData.payco_point?.tid ||
        rawData.toss_point?.tid ||
        null,
      method_origin: receiptData.method_origin || null,
      method_origin_symbol: receiptData.method_origin_symbol || null,
      raw_data: Object.keys(rawData).length > 0 ? rawData : null,
    };
  }

  /**
   * BootpayTransaction 생성 또는 업데이트
   * - receipt_id가 이미 존재하면 업데이트
   * - 없으면 새로 생성
   * @param dto CreateBootpayTransactionDto
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns BootpayTransaction
   */
  async createOrUpdate(
    dto: CreateBootpayTransactionDto,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;

    // receipt_id로 기존 거래 확인
    const existing = await prismaClient.bootpayTransaction.findUnique({
      where: { receipt_id: dto.receipt_id },
    });

    if (existing) {
      this.logger.log(
        `Updating existing BootpayTransaction: ${dto.receipt_id}`,
      );
      return await prismaClient.bootpayTransaction.update({
        where: { receipt_id: dto.receipt_id },
        data: {
          status: dto.status,
          status_locale: dto.status_locale,
          purchased_at: dto.purchased_at,
          cancelled_at: dto.cancelled_at,
          cancelled_price: dto.cancelled_price,
          cancelled_tax_free: dto.cancelled_tax_free,
          raw_response: dto.raw_response,
          updated_at: new Date(),
        },
      });
    }

    // 새로 생성
    this.logger.log(`Creating new BootpayTransaction: ${dto.receipt_id}`);
    return await prismaClient.bootpayTransaction.create({
      data: {
        user_idx: dto.user_idx,
        receipt_id: dto.receipt_id,
        order_id: dto.order_id,
        application_id: dto.application_id,
        price: dto.price,
        tax_free: dto.tax_free || 0,
        cancelled_price: dto.cancelled_price || 0,
        cancelled_tax_free: dto.cancelled_tax_free || 0,
        currency: dto.currency || 'KRW',
        order_name: dto.order_name,
        company_name: dto.company_name,
        pg: dto.pg,
        method: dto.method,
        method_symbol: dto.method_symbol,
        method_origin: dto.method_origin,
        method_origin_symbol: dto.method_origin_symbol,
        status: dto.status,
        status_locale: dto.status_locale,
        escrow_status: dto.escrow_status,
        escrow_status_locale: dto.escrow_status_locale,
        requested_at: dto.requested_at,
        purchased_at: dto.purchased_at,
        cancelled_at: dto.cancelled_at,
        gateway_url: dto.gateway_url,
        receipt_url: dto.receipt_url,
        metadata: dto.metadata,
        sandbox: dto.sandbox || false,
        raw_response: dto.raw_response,
      },
    });
  }

  /**
   * BootpayCardData 생성 (이미 존재하면 업데이트)
   * @param dto CreateBootpayCardDataDto
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns BootpayCardData
   */
  async createOrUpdateCardData(
    dto: CreateBootpayCardDataDto,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;

    // 기존 카드 데이터 확인
    const existing = await prismaClient.bootpayCardData.findUnique({
      where: { transaction_id: dto.transaction_id },
    });

    if (existing) {
      this.logger.log(
        `Updating existing BootpayCardData for transaction: ${dto.transaction_id}`,
      );
      return await prismaClient.bootpayCardData.update({
        where: { transaction_id: dto.transaction_id },
        data: {
          tid: dto.tid,
          card_approve_no: dto.card_approve_no,
          card_no: dto.card_no,
          card_company_code: dto.card_company_code,
          card_company: dto.card_company,
          card_type: dto.card_type,
          card_quota: dto.card_quota,
          card_interest: dto.card_interest,
          receipt_url: dto.receipt_url,
        },
      });
    }

    this.logger.log(
      `Creating new BootpayCardData for transaction: ${dto.transaction_id}`,
    );
    return await prismaClient.bootpayCardData.create({
      data: dto,
    });
  }

  /**
   * BootpayVbankData 생성 (이미 존재하면 업데이트)
   */
  async createOrUpdateVbankData(
    dto: CreateBootpayVbankDataDto,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;

    const existing = await prismaClient.bootpayVbankData.findUnique({
      where: { transaction_id: dto.transaction_id },
    });

    if (existing) {
      this.logger.log(
        `Updating existing BootpayVbankData for transaction: ${dto.transaction_id}`,
      );
      return await prismaClient.bootpayVbankData.update({
        where: { transaction_id: dto.transaction_id },
        data: {
          tid: dto.tid,
          bank_name: dto.bank_name,
          bank_username: dto.bank_username,
          bank_account: dto.bank_account,
          sender_name: dto.sender_name,
          expired_at: dto.expired_at,
          cash_receipt_tid: dto.cash_receipt_tid,
          cash_receipt_type: dto.cash_receipt_type,
          cash_receipt_no: dto.cash_receipt_no,
          receipt_url: dto.receipt_url,
        },
      });
    }

    this.logger.log(
      `Creating new BootpayVbankData for transaction: ${dto.transaction_id}`,
    );
    return await prismaClient.bootpayVbankData.create({
      data: dto,
    });
  }

  /**
   * BootpayEasyData 생성 (이미 존재하면 업데이트)
   */
  async createOrUpdateEasyData(
    dto: CreateBootpayEasyDataDto,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;

    const existing = await prismaClient.bootpayEasyData.findUnique({
      where: { transaction_id: dto.transaction_id },
    });

    if (existing) {
      this.logger.log(
        `Updating existing BootpayEasyData for transaction: ${dto.transaction_id}`,
      );
      return await prismaClient.bootpayEasyData.update({
        where: { transaction_id: dto.transaction_id },
        data: {
          tid: dto.tid,
          method_origin: dto.method_origin,
          method_origin_symbol: dto.method_origin_symbol,
          raw_data: dto.raw_data,
        },
      });
    }

    this.logger.log(
      `Creating new BootpayEasyData for transaction: ${dto.transaction_id}`,
    );
    return await prismaClient.bootpayEasyData.create({
      data: dto,
    });
  }

  /**
   * receipt_id로 BootpayTransaction 조회
   * @param receipt_id Bootpay 영수증 ID
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns BootpayTransaction 또는 null
   */
  async findByReceiptId(receipt_id: string, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.bootpayTransaction.findUnique({
      where: { receipt_id },
      include: {
        cardData: true,
        vbankData: true,
        easyData: true,
        topups: true,
      },
    });
  }

  /**
   * order_id로 BootpayTransaction 조회
   * @param order_id 주문 ID
   * @param tx 트랜잭션 클라이언트 (선택사항)
   * @returns BootpayTransaction 또는 null
   */
  async findByOrderId(order_id: string, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.bootpayTransaction.findFirst({
      where: { order_id },
      include: {
        cardData: true,
        vbankData: true,
        easyData: true,
        topups: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * 사용자의 Bootpay 거래 내역 조회
   * @param user_idx 사용자 ID
   * @param limit 조회 제한 수
   * @returns BootpayTransaction 목록
   */
  async findByUserId(user_idx: number, limit: number = 20) {
    return await this.prisma.bootpayTransaction.findMany({
      where: { user_idx },
      include: {
        cardData: true,
        vbankData: true,
        easyData: true,
        topups: true,
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }
}
