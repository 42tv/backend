import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('fan-level')
@Controller('fan-level')
export class FanLevelController {}
