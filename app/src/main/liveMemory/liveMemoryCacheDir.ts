// Live-memory offset cache lives under app userData — never in the game install dir.
// Each install path gets a stable subdirectory so multiple Steam libraries coexist.

import { createHash } from "node:crypto";
import { join } from "node:path";

export const LIVE_MEMORY_OFFSET_CACHE_DIR = "live-memory-offsets";

/** Env var set by LiveMemoryService when forking the utility worker. */
export const LIVE_MEMORY_USER_DATA_ENV = "TBH_USER_DATA";

/** Normalize install paths so the same folder hashes consistently on Windows. */
export function normalizeInstallPath(installDir: string): string {
  return installDir.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

/** Short stable id for a game install folder (Steam library path + app dir). */
export function hashInstallPath(installDir: string): string {
  return createHash("sha256").update(normalizeInstallPath(installDir)).digest("hex").slice(0, 16);
}

/** Per-install offset cache root under userData. */
export function resolveLiveMemoryOffsetCacheDir(userDataDir: string, installDir: string): string {
  return join(userDataDir, LIVE_MEMORY_OFFSET_CACHE_DIR, hashInstallPath(installDir));
}

/** userData root for the live-memory worker (main process sets TBH_USER_DATA on fork). */
export function resolveLiveMemoryUserDataDir(): string {
  const configured = process.env[LIVE_MEMORY_USER_DATA_ENV];
  if (configured) return configured;
  if (process.env["VITEST"]) {
    return join(
      process.env["TEMP"] ?? process.env["TMP"] ?? "/tmp",
      "tbh-live-memory-test-userdata",
    );
  }
  throw new Error(
    `${LIVE_MEMORY_USER_DATA_ENV} must be set before starting the live-memory worker`,
  );
}
