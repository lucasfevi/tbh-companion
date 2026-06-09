// Read, decrypt, and parse the TBH save file into a SaveSnapshot.
// Ported from tbh_xp/save_reader.py. See docs/SAVE_FORMAT.md for the layout.

import { readFileSync, statSync, existsSync } from "node:fs";
import * as es3 from "./es3";
import type { SaveSnapshot, HeroSnapshot } from "../../shared/types";

// Currency key for gold (the game's single currency).
export const GOLD_KEY = 100001;

export class SaveReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SaveReadError";
  }
}

function toNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// ES3 stores each top-level key as { "__type": ..., "value": <data> }, and
// `value` is frequently a JSON string that must be parsed again.
export function unwrapEs3Entry(entry: unknown): unknown {
  if (entry && typeof entry === "object" && "value" in (entry as Record<string, unknown>)) {
    const value = (entry as Record<string, unknown>).value;
    if (typeof value === "string") {
      const stripped = value.trim();
      if (stripped.startsWith("{") || stripped.startsWith("[")) {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
    }
    return value;
  }
  return entry;
}

export function parseSnapshot(decryptedText: string, saveMtime = 0): SaveSnapshot {
  const root = JSON.parse(decryptedText) as Record<string, unknown>;
  const player = unwrapEs3Entry(root?.PlayerSaveData) as Record<string, unknown> | undefined;
  if (!player || typeof player !== "object") {
    throw new SaveReadError("PlayerSaveData missing or malformed.");
  }

  const heroes: HeroSnapshot[] = [];
  let totalHeroExp = 0;
  const heroArr = (player.heroSaveDatas as unknown[]) ?? [];
  if (Array.isArray(heroArr)) {
    for (const raw of heroArr) {
      if (!raw || typeof raw !== "object") continue;
      const h = raw as Record<string, unknown>;
      const exp = toNum(h.HeroExp, 0);
      const hero: HeroSnapshot = {
        key: String(h.heroKey ?? "?"),
        level: Math.trunc(toNum(h.HeroLevel, 0)),
        exp,
        unlocked: Boolean(h.IsUnLock),
      };
      heroes.push(hero);
      totalHeroExp += exp;
    }
  }

  let gold = 0;
  const currencies = (player.currenySaveDatas as unknown[]) ?? [];
  if (Array.isArray(currencies)) {
    for (const raw of currencies) {
      if (raw && typeof raw === "object") {
        const cur = raw as Record<string, unknown>;
        if (Math.trunc(toNum(cur.Key, 0)) === GOLD_KEY) {
          gold = toNum(cur.Quantity, 0);
          break;
        }
      }
    }
  }

  let cubeLevel = 0;
  let cubeExp = 0;
  const cube = player.cubeSaveLevelData as Record<string, unknown> | undefined;
  if (cube && typeof cube === "object") {
    cubeLevel = Math.trunc(toNum(cube.Level, 0));
    cubeExp = toNum(cube.Exp, 0);
  }

  let playTime = 0;
  let stageKey = 0;
  let stageWave = 0;
  let maxStage = 0;
  const common = player.commonSaveData as Record<string, unknown> | undefined;
  if (common && typeof common === "object") {
    playTime = toNum(common.playTime, 0);
    stageKey = Math.trunc(toNum(common.currentStageKey, 0));
    stageWave = Math.trunc(toNum(common.currentStageWave, 0));
    maxStage = Math.trunc(toNum(common.maxCompletedStage, 0));
  }

  return {
    heroes,
    totalHeroExp,
    cubeLevel,
    cubeExp,
    playTime,
    saveMtime,
    stageKey,
    stageWave,
    maxStage,
    gold,
  };
}

// Synchronous sleep for the short shared-read retry (Atomics.wait blocks the
// thread without a busy loop).
function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// Read a file the game may be writing to; retry briefly on sharing violations.
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

/**
 * Read and decrypt the save once, returning the plaintext JSON and file mtime.
 * Lets callers run multiple parsers (snapshot + inventory) on a single decrypt.
 * `path` must already be an absolute, expanded path.
 */
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

/**
 * Read, decrypt and parse the save into a SaveSnapshot.
 * `path` must already be an absolute, expanded path.
 */
export function readSnapshot(path: string, password: string = es3.DEFAULT_PASSWORD): SaveSnapshot {
  const { text, mtime } = readAndDecrypt(path, password);
  try {
    return parseSnapshot(text, mtime);
  } catch (e) {
    if (e instanceof SaveReadError) throw e;
    throw new SaveReadError(`Decrypted data is not valid JSON: ${(e as Error).message}`);
  }
}
