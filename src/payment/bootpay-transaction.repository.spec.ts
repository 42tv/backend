import { BootpayTransactionRepository } from './bootpay-transaction.repository';

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
