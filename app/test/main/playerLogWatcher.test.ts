import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("PlayerLogWatcher", () => {
  let dir = "";

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "tbh-player-log-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("tails new GetBoxCount lines", async () => {
    const logPath = join(dir, "Player.log");
    writeFileSync(logPath, "boot\n");

    vi.resetModules();
    const { PlayerLogWatcher } = await import("../../src/main/playerLogWatcher");
    const drops: number[] = [];
    const watcher = new PlayerLogWatcher({
      path: logPath,
      pollMs: 50,
      onDrop: (itemKey) => drops.push(itemKey),
    });
    watcher.start();

    appendFileSync(logPath, "GetBoxCount Success Count : 1 // ItemKey : 920501\n");

    await new Promise((resolve) => setTimeout(resolve, 120));
    watcher.stop();

    expect(drops).toEqual([920501]);
  });
});
