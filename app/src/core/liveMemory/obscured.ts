// CodeStage Anti-Cheat (ACTk) ObscuredLong decode — pure, unit-testable.
// Layout: hash +0x0, hiddenValue +0x8, currentCryptoKey +0x10, fakeValue +0x18 (32 bytes total).

import { plausibleGold } from "./offsets";

/** ACTk ObscuredLong decrypt (GameAssembly xsx/xsp): (hidden - crypto) ^ crypto. */
function actkDecryptLong(hidden: bigint, crypto: bigint): bigint {
  return (hidden - crypto) ^ crypto;
}

/** A decoded gold value must be a positive safe integer (reject zeroed/garbage reads). */
function plausibleDecodedGold(v: number): boolean {
  return Number.isSafeInteger(v) && v > 0 && plausibleGold(v);
}

/**
 * Decode a value from an ObscuredLong field. Tries the decrypted value, then the
 * fake shadow, then a raw XOR — returning the first plausible positive integer, or
 * null when the buffer is too short or every candidate is garbage (mid key-rotation).
 */
export function decodeObscuredLong(buf: Buffer | Uint8Array, off = 0): number | null {
  if (buf.length < off + 0x20) return null;
  const view = buf instanceof Buffer ? buf : Buffer.from(buf);
  const hidden = view.readBigInt64LE(off + 8);
  const cryptoKey = view.readBigInt64LE(off + 0x10);
  const fake = view.readBigInt64LE(off + 0x18);
  const decrypted = actkDecryptLong(hidden, cryptoKey);

  for (const candidate of [decrypted, fake, hidden ^ cryptoKey]) {
    if (candidate <= 0n || candidate > 9007199254740991n) continue;
    const v = Number(candidate);
    if (plausibleDecodedGold(v)) return v;
  }
  return null;
}
