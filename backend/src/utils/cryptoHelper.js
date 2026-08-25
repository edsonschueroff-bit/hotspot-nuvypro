const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

function getKey() {
  const hexKey = process.env.MIKROTIK_ENCRYPTION_KEY || '62a846549c410b69d40d076cbf7b89207644183b19899db5afb20e7b82930f15';
  return Buffer.from(hexKey, 'hex');
}

/**
 * Criptografa uma string usando AES-256-GCM.
 * Retorna formato: enc:v1:<iv_hex>:<tag_hex>:<ciphertext_hex>
 */
function encrypt(text) {
  if (!text || typeof text !== 'string') return text;
  if (text.startsWith(PREFIX)) return text; // Já está criptografado

  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error('[cryptoHelper] Erro ao criptografar:', err.message);
    return text;
  }
}

/**
 * Descriptografa uma string protegida por AES-256-GCM.
 * Se não tiver o prefixo enc:v1:, retorna o texto original (fallback retrocompatível).
 */
function decrypt(cipherText) {
  if (!cipherText || typeof cipherText !== 'string') return cipherText;
  if (!cipherText.startsWith(PREFIX)) return cipherText; // Texto em claro legado

  try {
    const raw = cipherText.slice(PREFIX.length);
    const [ivHex, tagHex, contentHex] = raw.split(':');
    if (!ivHex || !tagHex || !contentHex) return cipherText;

    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    let decrypted = decipher.update(contentHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('[cryptoHelper] Erro ao descriptografar:', err.message);
    return cipherText;
  }
}

function isEncrypted(text) {
  return typeof text === 'string' && text.startsWith(PREFIX);
}

module.exports = {
  encrypt,
  decrypt,
  isEncrypted
};
