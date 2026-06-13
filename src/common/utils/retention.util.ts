/** 전자상거래법 §6 — 대금결제 및 재화공급 기록 보존 기간 */
export const TRANSACTION_RETENTION_YEARS = 5;

/** 거래 레코드에 기록하는 거래 당시 사용자 식별 스냅샷 (최소 수집) */
export type UserSnapshot = {
  user_idx: number;
  user_id: string;
  nickname: string;
};

/** 거래일 기준 파기 예정 시각 계산 */
export function retentionDeadline(from: Date = new Date()): Date {
  const deadline = new Date(from);
  deadline.setFullYear(deadline.getFullYear() + TRANSACTION_RETENTION_YEARS);
  return deadline;
}
