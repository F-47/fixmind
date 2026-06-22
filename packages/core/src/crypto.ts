import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from "node:crypto";

const SALT_BYTES = 16;
const IV_BYTES = 12;
const KEY_BYTES = 32;
const AUTH_TAG_BYTES = 16;

export function generateSalt(): string {
  return randomBytes(SALT_BYTES).toString("base64");
}

export function deriveKey(passphrase: string, saltBase64: string): Buffer {
  const salt = Buffer.from(saltBase64, "base64");
  return scryptSync(passphrase, salt, KEY_BYTES, { N: 16384, r: 8, p: 1 });
}

export interface EncryptedPayload {
  iv: string;
  ciphertext: string;
}

export function encrypt(plaintext: string, key: Buffer): EncryptedPayload {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString("base64"),
    ciphertext: Buffer.concat([encrypted, tag]).toString("base64"),
  };
}

export function decrypt(payload: EncryptedPayload, key: Buffer): string {
  const iv = Buffer.from(payload.iv, "base64");
  const combined = Buffer.from(payload.ciphertext, "base64");
  const tag = combined.subarray(combined.length - AUTH_TAG_BYTES);
  const encrypted = combined.subarray(0, combined.length - AUTH_TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
