import { Test, TestingModule } from '@nestjs/testing';
import { StreamViewerService } from './stream-viewer.service';

describe('StreamViewerService', () => {
  let service: StreamViewerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StreamViewerService],
    }).compile();

    service = module.get<StreamViewerService>(StreamViewerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
