// Attempt-cap bookkeeping for the self-healing offset extractor.
// Stores how many times extraction has been attempted for a given game version
// under a given app build, so an incomplete table is not re-scanned on every
// launch forever when a field is genuinely underivable. A new app build (which
// may ship an improved extractor) or a new game version resets the count.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { EXTRACTOR_REVISION } from "./offsetExtractor";

/** Max extractions per (game version, app build) before we stop retrying. */
export const MAX_EXTRACTION_ATTEMPTS = 3;

interface AttemptMarker {
  appBuild: string;
  attempts: number;
  /** Last extractor revision that recorded attempts — bump resets the budget. */
  extractorRevision?: number;
}

export function attemptMarkerPath(dir: string, version: string): string {
  return join(dir, `tbh-companion-offsets-v${version}.attempts.json`);
}

function readMarker(dir: string, version: string): AttemptMarker | null {
  try {
    const raw = readFileSync(attemptMarkerPath(dir, version), "utf-8");
    const parsed = JSON.parse(raw) as AttemptMarker;
    if (typeof parsed?.appBuild !== "string" || typeof parsed?.attempts !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Attempts recorded for this game version UNDER the current app build and
 * extractor revision. Returns 0 when no marker exists, the marker is from a
 * different app build, or a newer extractor shipped (revision bump).
 */
export function extractionAttempts(dir: string, version: string, appBuild: string): number {
  const marker = readMarker(dir, version);
  if (!marker || marker.appBuild !== appBuild) return 0;
  if ((marker.extractorRevision ?? 0) < EXTRACTOR_REVISION) return 0;
  return marker.attempts;
}

/** True when the extractor may run again for this version+build. */
export function mayAttemptExtraction(dir: string, version: string, appBuild: string): boolean {
  return extractionAttempts(dir, version, appBuild) < MAX_EXTRACTION_ATTEMPTS;
}

/**
 * Record one extraction attempt. Resets the counter to 1 when the app build or
 * extractor revision has changed since the last marker. No-throw: silently
 * swallows FS errors.
 */
export function recordExtractionAttempt(dir: string, version: string, appBuild: string): void {
  try {
    const prior = extractionAttempts(dir, version, appBuild);
    const marker: AttemptMarker = {
      appBuild,
      attempts: prior + 1,
      extractorRevision: EXTRACTOR_REVISION,
    };
    const path = attemptMarkerPath(dir, version);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(marker), "utf-8");
  } catch {
    // Non-fatal — worst case we retry more than the cap.
  }
}
