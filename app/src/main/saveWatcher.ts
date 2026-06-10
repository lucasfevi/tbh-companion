// Polls the save file's modification time and emits a parsed snapshot whenever
// it changes. Polling (rather than fs.watch) matches the Python tool and is
// robust to the game's atomic rewrites on Windows.

import { statSync } from "node:fs";
import { readAndDecrypt } from "./io/saveFile";
import { parseSnapshot, SaveReadError } from "../core/save/snapshot";
import { parseInventory } from "../core/inventory/parse";
import type { SaveSnapshot, InventorySnapshot } from "../../shared/types";
import { createLogger } from "./log";

const log = createLogger("saveWatcher");

export interface SaveWatcherOptions {
  path: string; // already expanded/absolute
  password: string;
  pollMs: number;
  onSnapshot: (snap: SaveSnapshot) => void;
  onError: (message: string) => void;
  onInventory?: (inv: InventorySnapshot) => void;
  parseInventorySnapshot?: (text: string, mtime: number) => InventorySnapshot;
}

export class SaveWatcher {
  private readonly opts: SaveWatcherOptions;
  private timer: NodeJS.Timeout | null = null;
  private lastMtimeMs: number | null = null;
  private loggedFirstRead = false;

  constructor(opts: SaveWatcherOptions) {
    this.opts = opts;
  }

  start(): void {
    this.tick();
    this.timer = setInterval(() => this.tick(), this.opts.pollMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private tick(): void {
    let mtimeMs: number;
    try {
      mtimeMs = statSync(this.opts.path).mtimeMs;
    } catch {
      const msg = `Save file not found: ${this.opts.path}`;
      log.warn(msg);
      this.opts.onError(msg);
      return;
    }

    if (this.lastMtimeMs !== null && mtimeMs === this.lastMtimeMs) {
      return; // unchanged since last read
    }

    try {
      const { text, mtime } = readAndDecrypt(this.opts.path, this.opts.password);
      const snap = parseSnapshot(text, mtime);
      this.lastMtimeMs = mtimeMs;
      if (!this.loggedFirstRead) {
        log.info(`First save read OK (stage ${snap.stageKey})`);
        this.loggedFirstRead = true;
      }
      this.opts.onSnapshot(snap);
      if (this.opts.onInventory) {
        try {
          const parse = this.opts.parseInventorySnapshot ?? parseInventory;
          this.opts.onInventory(parse(text, mtime));
        } catch (err) {
          log.error(`Inventory parse failed: ${String(err)}`);
        }
      }
    } catch (e) {
      // A mid-write read is transient; don't advance lastMtime so we retry.
      const msg = e instanceof SaveReadError ? e.message : String(e);
      log.warn(msg);
      this.opts.onError(msg);
    }
  }
}
