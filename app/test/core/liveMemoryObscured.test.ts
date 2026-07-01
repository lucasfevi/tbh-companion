import { describe, it, expect } from "vitest";
import { decodeObscuredLong } from "../../src/core/liveMemory/obscured";

/**
 * Build a 32-byte ObscuredLong at `off` within a buffer of `size`.
 * hash@0, hidden@8, crypto@0x10, fake@0x18.
 */
function makeObscured(
  fields: { hidden: bigint; crypto: bigint; fake: bigint },
  off = 0,
  size = off + 0x20,
): Buffer {
  const buf = Buffer.alloc(size);
  buf.writeBigInt64LE(fields.hidden, off + 8);
  buf.writeBigInt64LE(fields.crypto, off + 0x10);
  buf.writeBigInt64LE(fields.fake, off + 0x18);
  return buf;
}

/** Inverse of the ACTk decrypt: given the plaintext + key, produce the stored hidden value. */
function encodeHidden(value: bigint, crypto: bigint): bigint {
  return ((value ^ crypto) + crypto) & 0xffffffffffffffffn;
}

describe("decodeObscuredLong", () => {
  it("decodes a valid ObscuredLong via the decrypt path", () => {
    const crypto = 0x0123456789abcdefn;
    const buf = makeObscured({ hidden: encodeHidden(123456n, crypto), crypto, fake: 0n });
    expect(decodeObscuredLong(buf)).toBe(123456);
  });

  it("decodes a large but safe-integer value", () => {
    const crypto = 0xdead_beefn;
    const value = 9_000_000_000_000n; // < 2^53-1
    const buf = makeObscured({ hidden: encodeHidden(value, crypto), crypto, fake: 0n });
    expect(decodeObscuredLong(buf)).toBe(Number(value));
  });

  it("decodes at a non-zero offset within a larger buffer", () => {
    const crypto = 7n;
    const buf = makeObscured({ hidden: encodeHidden(4242n, crypto), crypto, fake: 0n }, 0x10, 0x40);
    expect(decodeObscuredLong(buf, 0x10)).toBe(4242);
  });

  it("falls back to the fake shadow when the decrypt is out of range", () => {
    // crypto=0 ⇒ decrypted = hidden (2^60, too large) ⇒ skipped; fake=500 is returned.
    const buf = makeObscured({ hidden: 1n << 60n, crypto: 0n, fake: 500n });
    expect(decodeObscuredLong(buf)).toBe(500);
  });

  it("returns null for an all-zero (garbage / mid-rotation) struct", () => {
    const buf = makeObscured({ hidden: 0n, crypto: 0n, fake: 0n });
    expect(decodeObscuredLong(buf)).toBeNull();
  });

  it("returns null when the buffer is too short to hold the struct", () => {
    expect(decodeObscuredLong(Buffer.alloc(0x1f))).toBeNull();
    expect(decodeObscuredLong(Buffer.alloc(0x20), 0x08)).toBeNull();
  });

  it("returns null when every candidate is out of range or non-positive", () => {
    // decrypted & xor = 2^60 (exceeds the safe-integer ceiling), fake = -5 (non-positive).
    const buf = makeObscured({ hidden: 1n << 60n, crypto: 0n, fake: -5n });
    expect(decodeObscuredLong(buf)).toBeNull();
  });
});
