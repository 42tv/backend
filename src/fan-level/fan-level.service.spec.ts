import { Test, TestingModule } from '@nestjs/testing';
import { FanLevelService } from './fan-level.service';

describe('FanLevelService', () => {
  let service: FanLevelService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FanLevelService],
    }).compile();

    service = module.get<FanLevelService>(FanLevelService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
