import { Test, TestingModule } from '@nestjs/testing';
import { WithholdingReportService } from './withholding-report.service';
import { SettlementRepository } from './settlement.repository';

describe('WithholdingReportService', () => {
  let service: WithholdingReportService;
  let repository: jest.Mocked<SettlementRepository>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithholdingReportService,
        {
          provide: SettlementRepository,
          useValue: {
            aggregateWithholdingByPeriod: jest.fn(),
            groupWithholdingByStreamer: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WithholdingReportService>(WithholdingReportService);
    repository = module.get(SettlementRepository);
  });

  describe('getMonthlyWithholdingReport', () => {
    it('월 경계를 [해당월, 다음월)로 조회하고 합계를 매핑한다', async () => {
      repository.aggregateWithholdingByPeriod.mockResolvedValue({
        sum: {
          tax_base: 18000,
          income_tax_amount: 540,
          local_tax_amount: 54,
          payout_amount: 17406,
        },
        personnel: 2,
      });

      const result = await service.getMonthlyWithholdingReport(2026, 6);

      const [start, end] =
        repository.aggregateWithholdingByPeriod.mock.calls[0];
      expect(start.toISOString()).toBe('2026-06-01T00:00:00.000Z');
      expect(end.toISOString()).toBe('2026-07-01T00:00:00.000Z');

      expect(result).toEqual({
        period: '2026-06',
        personnel: 2,
        totalTaxBase: 18000,
        totalIncomeTax: 540,
        totalLocalTax: 54,
        totalPayout: 17406,
      });
    });

    it('집계 결과가 없으면 0으로 채운다', async () => {
      repository.aggregateWithholdingByPeriod.mockResolvedValue({
        sum: {
          tax_base: null,
          income_tax_amount: null,
          local_tax_amount: null,
          payout_amount: null,
        },
        personnel: 0,
      });

      const result = await service.getMonthlyWithholdingReport(2026, 1);
      expect(result).toMatchObject({
        totalTaxBase: 0,
        totalIncomeTax: 0,
        totalLocalTax: 0,
        totalPayout: 0,
      });
    });

    it('month 범위를 벗어나면 예외', async () => {
      await expect(
        service.getMonthlyWithholdingReport(2026, 13),
      ).rejects.toThrow();
    });
  });

  describe('getPaymentStatement', () => {
    it('month 미지정 시 연간 [1/1, 다음해 1/1) 범위로 스트리머별 집계', async () => {
      repository.groupWithholdingByStreamer.mockResolvedValue([
        {
          streamer_idx: 1,
          _sum: {
            tax_base: 9000,
            income_tax_amount: 270,
            local_tax_amount: 27,
            payout_amount: 8703,
          },
        },
      ] as any);

      const result = await service.getPaymentStatement(2026);

      const [start, end] = repository.groupWithholdingByStreamer.mock.calls[0];
      expect(start.toISOString()).toBe('2026-01-01T00:00:00.000Z');
      expect(end.toISOString()).toBe('2027-01-01T00:00:00.000Z');

      expect(result.period).toBe('2026');
      expect(result.statements[0]).toEqual({
        streamerIdx: 1,
        totalTaxBase: 9000,
        totalIncomeTax: 270,
        totalLocalTax: 27,
        totalPayout: 8703,
      });
    });
  });
});
