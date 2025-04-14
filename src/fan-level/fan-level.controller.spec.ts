import { Test, TestingModule } from '@nestjs/testing';
import { FanLevelController } from './fan-level.controller';

describe('FanLevelController', () => {
  let controller: FanLevelController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FanLevelController],
    }).compile();

    controller = module.get<FanLevelController>(FanLevelController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
