import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.SETTLEMENT_ACCOUNT_ENCRYPTION_KEY ?? '';
  if (!key) throw new Error('SETTLEMENT_ACCOUNT_ENCRYPTION_KEY is not set');
  return Buffer.from(key.padEnd(32, '0').slice(0, 32));
}

function getFingerprintKey(): string {
  const key = process.env.SETTLEMENT_ACCOUNT_FINGERPRINT_KEY ?? '';
  if (!key) throw new Error('SETTLEMENT_ACCOUNT_FINGERPRINT_KEY is not set');
  return key;
}

export function encryptAccountNumber(plain: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, 'utf8'),
    cipher.final(),
  ]);
  return `${iv.toString('hex')}:${encrypted.toString('base64')}`;
}

export function decryptAccountNumber(ciphertext: string): string {
  const [ivHex, encryptedBase64] = ciphertext.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function maskAccountNumber(plain: string): string {
  const digits = plain.replace(/\D/g, '');
  if (digits.length <= 4) return '****';
  return `${'*'.repeat(digits.length - 4)}${digits.slice(-4)}`;
}

export function maskHolderName(name: string): string {
  if (!name || name.length === 0) return '';
  if (name.length === 1) return '*';
  if (name.length === 2) return `${name[0]}*`;
  return `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}`;
}

export function generateAccountFingerprint(
  bankCode: string,
  accountNumber: string,
): string {
  const normalized = accountNumber.replace(/\D/g, '');
  return createHmac('sha256', getFingerprintKey())
    .update(`${bankCode}:${normalized}`)
    .digest('hex');
}
