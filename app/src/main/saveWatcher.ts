// Polls the save file's modification time and emits a parsed snapshot whenever
// it changes. Polling (rather than fs.watch) matches the Python tool and is
// robust to the game's atomic rewrites on Windows.

import { statSync } from "node:fs";
import { readAndDecrypt, parseSnapshot, SaveReadError } from "../core/saveReader";
import { parseInventory } from "../core/inventory";
import type { SaveSnapshot, InventorySnapshot } from "../../shared/types";

export interface SaveWatcherOptions {
  path: string; // already expanded/absolute
  password: string;
  pollMs: number;
  onSnapshot: (snap: SaveSnapshot) => void;
  onError: (message: string) => void;
  onInventory?: (inv: InventorySnapshot) => void;
}

export class SaveWatcher {
  private readonly opts: SaveWatcherOptions;
  private timer: NodeJS.Timeout | null = null;
  private lastMtimeMs: number | null = null;

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
      this.opts.onError(`Save file not found: ${this.opts.path}`);
      return;
    }

    if (this.lastMtimeMs !== null && mtimeMs === this.lastMtimeMs) {
      return; // unchanged since last read
    }

    try {
      const { text, mtime } = readAndDecrypt(this.opts.path, this.opts.password);
      const snap = parseSnapshot(text, mtime);
      this.lastMtimeMs = mtimeMs;
      this.opts.onSnapshot(snap);
      if (this.opts.onInventory) {
        try {
          this.opts.onInventory(parseInventory(text, mtime));
        } catch {
          // inventory parse failures shouldn't break XP tracking
        }
      }
    } catch (e) {
      // A mid-write read is transient; don't advance lastMtime so we retry.
      const msg = e instanceof SaveReadError ? e.message : String(e);
      this.opts.onError(msg);
    }
  }
}
