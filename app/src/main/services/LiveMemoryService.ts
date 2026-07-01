// Owns the live-memory utilityProcess: spawn/lifecycle + broadcast to renderers.
// The heavy read loop runs in the worker process, so this service stays cheap on
// the main thread. Lifecycle is tied to the enable toggle (not tracking start).

import { utilityProcess, type UtilityProcess } from "electron";
import { join } from "node:path";
import { IPC } from "../../../shared/ipc";
import type { LiveMemorySnapshot, LiveMemoryStatus } from "../../../shared/types";
import { broadcast } from "./broadcast";
import { createLogger } from "../log";

const log = createLogger("liveMemory");

type WorkerMessage =
  | { type: "snapshot"; snapshot: LiveMemorySnapshot }
  | { type: "status"; status: LiveMemoryStatus };

export class LiveMemoryService {
  private child: UtilityProcess | null = null;
  private lastSnapshot: LiveMemorySnapshot | null = null;
  private lastStatus: LiveMemoryStatus | null = null;

  get running(): boolean {
    return this.child != null;
  }

  start(): void {
    if (this.child) return;
    // electron-vite emits the worker next to the main bundle (out/main/liveMemoryWorker.js).
    const workerPath = join(__dirname, "liveMemoryWorker.js");
    try {
      this.child = utilityProcess.fork(workerPath, [], {
        serviceName: "tbh-live-memory",
        stdio: "ignore",
      });
    } catch (err) {
      log.error(`Failed to fork live-memory worker: ${String(err)}`);
      return;
    }

    this.child.on("message", (msg: WorkerMessage) => {
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "snapshot") {
        this.lastSnapshot = msg.snapshot;
        broadcast(IPC.LIVE_MEMORY, msg.snapshot);
      } else if (msg.type === "status") {
        this.lastStatus = msg.status;
        broadcast(IPC.LIVE_MEMORY_STATUS, msg.status);
      }
    });

    this.child.on("exit", (code) => {
      log.warn(`Live-memory worker exited (code ${code}).`);
      this.child = null;
    });

    log.info("Live-memory worker started.");
  }

  stop(): void {
    if (this.child) {
      try {
        this.child.postMessage("stop");
        this.child.kill();
      } catch {
        // already gone
      }
      this.child = null;
    }
    this.lastSnapshot = null;
    // Terminal status so renderers revert every stat to its save-file source.
    const terminal: LiveMemoryStatus = {
      running: false,
      attached: false,
      pid: null,
      gameVersion: this.lastStatus?.gameVersion ?? null,
      supported: false,
    };
    this.lastStatus = terminal;
    broadcast(IPC.LIVE_MEMORY_STATUS, terminal);
    log.info("Live-memory worker stopped.");
  }

  getSnapshot(): LiveMemorySnapshot | null {
    return this.lastSnapshot;
  }

  getStatus(): LiveMemoryStatus | null {
    return this.lastStatus;
  }
}
