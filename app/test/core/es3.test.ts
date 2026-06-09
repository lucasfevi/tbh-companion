import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { decrypt, decryptToText, Es3Error, DEFAULT_PASSWORD } from "../../src/core/es3";

// Encrypt with the exact ES3 scheme so we validate decryption against a known
// encryption (PBKDF2-SHA1 100 iters, AES-128-CBC, PKCS7, IV prepended).
function es3Encrypt(plaintext: string, password: string): Buffer {
  const iv = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(Buffer.from(password, "utf8"), iv, 100, 16, "sha1");
  const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
  const ct = Buffer.concat([cipher.update(Buffer.from(plaintext, "utf8")), cipher.final()]);
  return Buffer.concat([iv, ct]);
}

describe("es3", () => {
  it("round-trips a JSON payload", () => {
    const payload = JSON.stringify({ hello: "world", n: 42, arr: [1, 2, 3] });
    const blob = es3Encrypt(payload, DEFAULT_PASSWORD);
    expect(decryptToText(blob)).toBe(payload);
  });

  it("round-trips UTF-8 multibyte content", () => {
    const payload = JSON.stringify({ name: "Sorcerer", emoji: "x_\u00e9\u00e8" });
    const blob = es3Encrypt(payload, DEFAULT_PASSWORD);
    expect(decryptToText(blob)).toBe(payload);
  });

  it("throws a clean error on wrong password", () => {
    const blob = es3Encrypt("{}", DEFAULT_PASSWORD);
    expect(() => decrypt(blob, "not-the-password")).toThrow(Es3Error);
  });

  it("rejects a file that is too small", () => {
    expect(() => decrypt(Buffer.alloc(8))).toThrow(Es3Error);
  });

  it("rejects a mid-write (non-block-aligned) ciphertext", () => {
    const blob = Buffer.concat([crypto.randomBytes(16), crypto.randomBytes(17)]);
    expect(() => decrypt(blob)).toThrow(/multiple of the AES block size/);
  });
});
