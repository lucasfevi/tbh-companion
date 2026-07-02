import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  attemptMarkerPath,
  extractionAttempts,
  mayAttemptExtraction,
  recordExtractionAttempt,
  MAX_EXTRACTION_ATTEMPTS,
} from "../../src/main/liveMemory/offsetHealing";

const DIR = join(process.env["TEMP"] ?? "/tmp", `tbh-offset-healing-${process.pid}`);
const VERSION = "1.00.21";
const BUILD = "2.3.4";

beforeEach(() => mkdirSync(DIR, { recursive: true }));
afterEach(() => {
  try {
    rmSync(DIR, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe("extractionAttempts", () => {
  it("returns 0 when no marker exists", () => {
    expect(extractionAttempts(DIR, VERSION, BUILD)).toBe(0);
  });

  it("counts recorded attempts for the same build", () => {
    recordExtractionAttempt(DIR, VERSION, BUILD);
    recordExtractionAttempt(DIR, VERSION, BUILD);
    expect(extractionAttempts(DIR, VERSION, BUILD)).toBe(2);
  });

  it("resets to 0 for a different app build (may ship an improved extractor)", () => {
    recordExtractionAttempt(DIR, VERSION, BUILD);
    recordExtractionAttempt(DIR, VERSION, BUILD);
    expect(extractionAttempts(DIR, VERSION, "9.9.9")).toBe(0);
  });

  it("resets to 0 when the extractor revision bumps", () => {
    recordExtractionAttempt(DIR, VERSION, BUILD);
    recordExtractionAttempt(DIR, VERSION, BUILD);
    expect(extractionAttempts(DIR, VERSION, BUILD)).toBe(2);
    // Simulate an older marker written before EXTRACTOR_REVISION was recorded.
    writeFileSync(
      attemptMarkerPath(DIR, VERSION),
      JSON.stringify({ appBuild: BUILD, attempts: 3, extractorRevision: 0 }),
      "utf-8",
    );
    expect(extractionAttempts(DIR, VERSION, BUILD)).toBe(0);
    expect(mayAttemptExtraction(DIR, VERSION, BUILD)).toBe(true);
  });

  it("is keyed per game version", () => {
    recordExtractionAttempt(DIR, VERSION, BUILD);
    expect(extractionAttempts(DIR, "2.00.00", BUILD)).toBe(0);
  });
});

describe("mayAttemptExtraction", () => {
  it("allows attempts until the cap is reached, then stops", () => {
    for (let i = 0; i < MAX_EXTRACTION_ATTEMPTS; i++) {
      expect(mayAttemptExtraction(DIR, VERSION, BUILD)).toBe(true);
      recordExtractionAttempt(DIR, VERSION, BUILD);
    }
    expect(mayAttemptExtraction(DIR, VERSION, BUILD)).toBe(false);
  });

  it("re-opens the budget when the app build changes", () => {
    for (let i = 0; i < MAX_EXTRACTION_ATTEMPTS; i++) recordExtractionAttempt(DIR, VERSION, BUILD);
    expect(mayAttemptExtraction(DIR, VERSION, BUILD)).toBe(false);
    expect(mayAttemptExtraction(DIR, VERSION, "next-build")).toBe(true);
  });
});
