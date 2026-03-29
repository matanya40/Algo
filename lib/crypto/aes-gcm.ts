import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 16;
const SALT = "strategy-vault:tradovate:v1";

function deriveKeyFromSecret(secret: string): Buffer {
  return scryptSync(secret, SALT, 32);
}

function parseKeyMaterial(): Buffer {
  const raw = process.env.TRADOVATE_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error("TRADOVATE_ENCRYPTION_KEY is not set");
  }
  const b64 = Buffer.from(raw, "base64");
  if (b64.length === 32) {
    return b64;
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  return deriveKeyFromSecret(raw);
}

/**
 * Format: v1:<iv_b64>:<tag_b64>:<ciphertext_b64>
 */
export function encryptSecret(plain: string): string {
  const key = parseKeyMaterial();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv, { authTagLength: 16 });
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const key = parseKeyMaterial();
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Invalid ciphertext format");
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = createDecipheriv(ALGO, key, iv, { authTagLength: 16 });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
