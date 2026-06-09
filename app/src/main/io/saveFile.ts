// File I/O for the encrypted save — lives in main, not core.

import { readFileSync, statSync, existsSync } from "node:fs";
import * as es3 from "../../core/es3";
import { parseSnapshot, SaveReadError } from "../../core/save/snapshot";
import type { SaveSnapshot } from "../../../shared/types";

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function readBytesShared(path: string, retries = 4, delayMs = 50): Buffer {
  let last: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return readFileSync(path);
    } catch (e) {
      last = e;
      sleepSync(delayMs);
    }
  }
  throw new SaveReadError(`Could not read save file: ${String(last)}`);
}

export function readAndDecrypt(
  path: string,
  password: string = es3.DEFAULT_PASSWORD,
): { text: string; mtime: number } {
  if (!existsSync(path)) {
    throw new SaveReadError(`Save file not found: ${path}`);
  }
  const mtime = statSync(path).mtimeMs / 1000;
  const raw = readBytesShared(path);
  try {
    return { text: es3.decryptToText(raw, password), mtime };
  } catch (e) {
    throw new SaveReadError((e as Error).message);
  }
}

export function readSnapshot(path: string, password: string = es3.DEFAULT_PASSWORD): SaveSnapshot {
  const { text, mtime } = readAndDecrypt(path, password);
  try {
    return parseSnapshot(text, mtime);
  } catch (e) {
    if (e instanceof SaveReadError) throw e;
    throw new SaveReadError(`Decrypted data is not valid JSON: ${(e as Error).message}`);
  }
}
