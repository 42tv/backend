import { Test, TestingModule } from '@nestjs/testing';
import { IvsService } from './ivs.service';

describe('IvsService', () => {
  let service: IvsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IvsService],
    }).compile();

    service = module.get<IvsService>(IvsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
