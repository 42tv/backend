/**
 * 팬 레벨 정보 인터페이스
 * - 단일 출처 원칙(Single Source of Truth)에 따라 팬 레벨 정보는 여기서 정의
 * - DonationPayload, FanLevelUpPayload 등에서 이 타입을 재사용
 */
export interface FanLevelInfo {
  name: string;
  color: string;
}
