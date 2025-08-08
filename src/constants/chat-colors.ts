/**
 * 사용자 역할별 기본 색상 정의
 */
export const USER_ROLE_COLORS = {
  broadcaster: '#e0b21aff', // 빨간색 계열
  manager: '#24f109ff', // 청록색 계열
  guest: '#6B7280', // 회색 계열
} as const;

/**
 * 사용자 역할 타입
 */
export type UserRole = keyof typeof USER_ROLE_COLORS;

/**
 * 주어진 역할에 대한 기본 색상을 반환합니다.
 * @param role 사용자 역할
 * @returns 해당 역할의 색상 또는 guest 색상 (기본값)
 */
export function getUserRoleColor(role: string): string {
  return USER_ROLE_COLORS[role as UserRole] || USER_ROLE_COLORS.guest;
}
