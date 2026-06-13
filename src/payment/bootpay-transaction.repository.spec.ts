import { BootpayTransactionRepository } from './bootpay-transaction.repository';

describe('BootpayTransactionRepository.fromReceiptResponse', () => {
  it('거래 당시 사용자 스냅샷을 DTO에 포함한다', () => {
    const receiptData: any = {
      receipt_id: 'r1',
      order_id: 'o1',
      price: 11000,
      order_name: '코인 1100개',
      pg: 'kcp',
      method: 'card',
      method_symbol: 'card',
      status: 1,
      requested_at: '2026-06-13T00:00:00+09:00',
    };
    const snapshot = { user_idx: 1, user_id: 'tester', nickname: '테스터' };

    const result = BootpayTransactionRepository.fromReceiptResponse(
      receiptData,
      1,
      snapshot,
      'app-id',
    );

    expect(result.user_idx).toBe(1);
    expect(result.user_snapshot).toEqual(snapshot);
  });
});

describe('BootpayTransactionRepository.fromEasyData', () => {
  it('uses kakao_moneny_data when provided by current sdk type', () => {
    const receiptData: any = {
      method_origin: '카카오페이',
      method_origin_symbol: 'kakaopay',
      kakao_moneny_data: { tid: 'kakao_tid_1' },
    };

    const result = BootpayTransactionRepository.fromEasyData(
      receiptData,
      'tx_1',
    );

    expect(result.tid).toBe('kakao_tid_1');
    expect(result.raw_data).toEqual({
      kakao_money: { tid: 'kakao_tid_1' },
    });
  });

  it('falls back to kakao_money_data when docs naming is provided', () => {
    const receiptData: any = {
      method_origin: '카카오페이',
      method_origin_symbol: 'kakaopay',
      kakao_money_data: { tid: 'kakao_tid_2' },
    };

    const result = BootpayTransactionRepository.fromEasyData(
      receiptData,
      'tx_2',
    );

    expect(result.tid).toBe('kakao_tid_2');
    expect(result.raw_data).toEqual({
      kakao_money: { tid: 'kakao_tid_2' },
    });
  });
});
