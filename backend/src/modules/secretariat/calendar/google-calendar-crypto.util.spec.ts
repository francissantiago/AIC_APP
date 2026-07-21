import {
  decryptSecret,
  encryptSecret,
  resolveEncryptionKey,
  sha256Hex,
} from './google-calendar-crypto.util';

describe('google-calendar-crypto.util', () => {
  const hexKey = 'a'.repeat(64);

  it('encrypt/decrypt round-trip with hex key', () => {
    const plain = 'ya29.access-token-sample';
    const encrypted = encryptSecret(plain, hexKey);
    expect(encrypted).not.toContain(plain);
    expect(decryptSecret(encrypted, hexKey)).toBe(plain);
  });

  it('encrypt/decrypt round-trip with base64 key', () => {
    const key = Buffer.alloc(32, 7).toString('base64');
    const plain = 'refresh-token-value';
    expect(decryptSecret(encryptSecret(plain, key), key)).toBe(plain);
  });

  it('derives stable key from arbitrary secret', () => {
    const a = resolveEncryptionKey('dev-secret');
    const b = resolveEncryptionKey('dev-secret');
    expect(a.equals(b)).toBe(true);
    expect(a.length).toBe(32);
  });

  it('sha256Hex is deterministic', () => {
    expect(sha256Hex('abc')).toBe(sha256Hex('abc'));
    expect(sha256Hex('abc')).not.toBe(sha256Hex('abd'));
  });
});
