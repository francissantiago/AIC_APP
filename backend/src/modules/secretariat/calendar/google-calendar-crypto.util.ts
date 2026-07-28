/**
 * Re-export do helper AES-GCM genérico (AIC-SEC-013).
 * Mantém imports históricos do módulo Google Calendar.
 */
export {
  decryptSecret,
  encryptSecret,
  resolveEncryptionKey,
  sha256Hex,
} from '../../../common/crypto/secret-crypto.util';
