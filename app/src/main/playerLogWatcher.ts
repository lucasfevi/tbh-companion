// Tails Unity Player.log for chest drop lines (GetBoxCount Success).
// Polling matches SaveWatcher — robust on Windows when the game rewrites the log.

import { statSync } from "node:fs";
import { parseGetBoxCountItemKeys } from "../core/playerLog";
import { readFileTailUtf8 } from "./io/fileTail";
import { createLogger } from "./log";

const log = createLogger("playerLog");

export interface PlayerLogWatcherOptions {
  path: string;
  pollMs: number;
  onDrop: (itemKey: number) => void;
  onAvailability?: (available: boolean) => void;
}

export class PlayerLogWatcher {
  private readonly opts: PlayerLogWatcherOptions;
  private timer: NodeJS.Timeout | null = null;
  private offset = 0;
  private available: boolean | null = null;
  private loggedReady = false;

  constructor(opts: PlayerLogWatcherOptions) {
    this.opts = opts;
  }

  start(): void {
    this.offset = 0;
    this.available = null;
    this.loggedReady = false;
    this.seekToEnd();
    this.tick();
    this.timer = setInterval(() => this.tick(), this.opts.pollMs);
    log.info(`Player.log watcher started (poll ${this.opts.pollMs}ms, path ${this.opts.path})`);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private seekToEnd(): void {
    try {
      this.offset = statSync(this.opts.path).size;
    } catch {
      this.offset = 0;
      this.setAvailable(false);
    }
  }

  private setAvailable(available: boolean): void {
    if (this.available === available) return;
    this.available = available;
    this.opts.onAvailability?.(available);
    if (available && !this.loggedReady) {
      log.info("Player.log available — watching for chest drops");
      this.loggedReady = true;
    }
  }

  private tick(): void {
    const { text, nextOffset, available } = readFileTailUtf8(this.opts.path, this.offset);
    this.setAvailable(available);
    if (!available || !text) return;

    this.offset = nextOffset;
    for (const itemKey of parseGetBoxCountItemKeys(text)) {
      this.opts.onDrop(itemKey);
    }
  }
}
