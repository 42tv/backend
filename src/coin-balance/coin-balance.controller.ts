import { Controller } from '@nestjs/common';
import { CoinBalanceService } from './coin-balance.service';

@Controller('coin-balance')
export class CoinBalanceController {
  constructor(private readonly coinBalanceService: CoinBalanceService) {}
}
