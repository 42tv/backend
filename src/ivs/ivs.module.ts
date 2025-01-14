import { Module } from '@nestjs/common';
import { IvsController } from './ivs.controller';

@Module({
  controllers: [IvsController]
})
export class IvsModule {}
