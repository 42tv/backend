import { Test, TestingModule } from '@nestjs/testing';
import { IvsController } from './ivs.controller';

describe('IvsController', () => {
  let controller: IvsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IvsController],
    }).compile();

    controller = module.get<IvsController>(IvsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
