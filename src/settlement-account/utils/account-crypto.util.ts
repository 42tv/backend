import { createHash, createCipheriv, createDecipheriv } from 'crypto';

// NOTE: Task 03 will replace these stubs with production-grade encryption using pgcrypto or AES-256-GCM.
// For now these use base64 encoding to keep columns non-null and structurally valid.

const ENCRYPTION_KEY =
  process.env.ACCOUNT_ENCRYPTION_KEY || 'dev_placeholder_key_32bytes_long!';
const ALGORITHM = 'aes-256-ecb';

function getKey(): Buffer {
  return Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
}

export function encryptValue(plaintext: string): string {
  const key = getKey();
  const cipher = createCipheriv(ALGORITHM, key, null);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  return encrypted.toString('base64');
}

export function decryptValue(ciphertext: string): string {
  const key = getKey();
  const decipher = createDecipheriv(ALGORITHM, key, null);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function encryptAccountNumber(accountNumber: string): string {
  return encryptValue(accountNumber);
}

export function maskAccountNumber(accountNumber: string): string {
  const digits = accountNumber.replace(/\D/g, '');
  if (digits.length <= 4) return '****';
  const visible = digits.slice(-4);
  const masked = '*'.repeat(Math.max(digits.length - 4, 4));
  return `${masked}${visible}`;
}

export function generateFingerprint(
  bankCode: string,
  accountNumber: string,
): string {
  const normalized = accountNumber.replace(/\D/g, '');
  return createHash('sha256').update(`${bankCode}:${normalized}`).digest('hex');
}

export function maskName(name: string): string {
  if (!name || name.length === 0) return '';
  if (name.length === 1) return '*';
  if (name.length === 2) return `${name[0]}*`;
  return `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}`;
}
