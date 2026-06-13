import crypto from "node:crypto";
import { DEFAULT_PASSWORD } from "../../../src/core/es3";

/** Encrypt plaintext with the production ES3 scheme (for benchmark fixtures). */
export function es3Encrypt(plaintext: string, password: string = DEFAULT_PASSWORD): Buffer {
  const iv = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(Buffer.from(password, "utf8"), iv, 100, 16, "sha1");
  const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(plaintext, "utf8")), cipher.final()]);
  return Buffer.concat([iv, ciphertext]);
}
