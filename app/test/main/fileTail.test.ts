import { describe, it, expect } from "vitest";
import { appendFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readFileTailUtf8 } from "../../src/main/io/fileTail";

describe("readFileTailUtf8", () => {
  it("reads appended bytes and advances offset", () => {
    const dir = mkdtempSync(join(tmpdir(), "tbh-file-tail-"));
    const path = join(dir, "Player.log");
    writeFileSync(path, "boot\n");

    const first = readFileTailUtf8(path, 0);
    expect(first.available).toBe(true);
    expect(first.text).toBe("boot\n");
    expect(first.nextOffset).toBe(5);

    appendFileSync(path, "line2\n");
    const second = readFileTailUtf8(path, first.nextOffset);
    expect(second.text).toBe("line2\n");
    expect(second.nextOffset).toBeGreaterThan(first.nextOffset);
  });

  it("reports unavailable when file is missing", () => {
    const result = readFileTailUtf8(join(tmpdir(), "missing-player-log"), 0);
    expect(result.available).toBe(false);
    expect(result.text).toBe("");
  });
});
