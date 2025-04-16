import { Test, TestingModule } from '@nestjs/testing';
import { BroadcastSettingService } from './broadcast-setting.service';

describe('BroadcastSettingService', () => {
  let service: BroadcastSettingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BroadcastSettingService],
    }).compile();

    service = module.get<BroadcastSettingService>(BroadcastSettingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
