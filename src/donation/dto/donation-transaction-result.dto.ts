import { FanLevelInfo } from '../../fan/interfaces/fan-level.interface';

/**
 * 후원 트랜잭션 처리 결과 DTO
 */
export interface DonationTransactionResult {
  donation: any;
  isLevelUpgraded: boolean;
  oldLevel: FanLevelInfo | null;
  updatedFan: any;
}
