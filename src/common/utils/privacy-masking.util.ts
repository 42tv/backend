/**
 * 개인정보 마스킹 유틸 (관리자 화면 기본 노출용)
 * 원문 열람은 admin/users/:idx/privacy-view 경유로만 허용한다.
 */

export function maskName(name: string | null | undefined): string {
  if (!name) return '';
  if (name.length === 1) return '*';
  if (name.length === 2) return `${name[0]}*`;
  return `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}`;
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return '*'.repeat(phone.length);
  return `${digits.slice(0, 3)}-${'*'.repeat(4)}-${digits.slice(-4)}`;
}

export function maskEmail(email: string | null | undefined): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return '*'.repeat(email.length);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(local.length - visible.length, 1))}@${domain}`;
}

export function maskAddress(address: string | null | undefined): string {
  if (!address) return '';
  // 앞 단위(시/도 + 시/군/구 수준)만 남기고 상세 주소는 마스킹
  const parts = address.split(' ');
  if (parts.length <= 2) return `${parts[0] ?? ''} ***`;
  return `${parts[0]} ${parts[1]} ***`;
}
