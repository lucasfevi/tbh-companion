// Live-memory utilityProcess entry point.
//
// Runs in a SEPARATE OS process so the high-frequency read loop + native FFI
// never touch the Electron main thread or renderer (perf-isolation requirement).
// Streams snapshots + status to the main process via parentPort.

import type { LiveMemorySnapshot, LiveMemoryStatus } from "../../../shared/types";
import { LiveMemoryReader } from "./liveReader";

// utilityProcess exposes parentPort on the global process object.
const parentPort = (
  process as unknown as {
    parentPort?: {
      postMessage: (m: unknown) => void;
      on: (e: string, cb: (m: unknown) => void) => void;
    };
  }
).parentPort;

const POLL_ATTACHED_MS = 40; // ~25 Hz while attached (read costs ~0.2 ms)
const POLL_DETACHED_MS = 1500; // retry attach while the game is closed
const HEAL_UNSUPPORTED_MS = 10_000; // re-try offset resolution while degraded

let reader: LiveMemoryReader | null = null;
let loadError: string | null = null;
let healDueAt = 0;

try {
  reader = new LiveMemoryReader();
  reader.setLogger((message) => post({ type: "log", message }));
} catch (err) {
  loadError = err instanceof Error ? err.message : String(err);
}

type WorkerMessage =
  | { type: "snapshot"; snapshot: LiveMemorySnapshot }
  | { type: "status"; status: LiveMemoryStatus }
  | { type: "log"; message: string };

function post(msg: WorkerMessage): void {
  parentPort?.postMessage(msg);
}

let lastStatusKey = "";
function postStatusIfChanged(): void {
  const status: LiveMemoryStatus = reader
    ? reader.status()
    : {
        running: true,
        attached: false,
        pid: null,
        gameVersion: null,
        supported: false,
        note: loadError ?? "reader unavailable",
      };
  const key = JSON.stringify(status);
  if (key !== lastStatusKey) {
    lastStatusKey = key;
    post({ type: "status", status });
  }
}

let timer: NodeJS.Timeout | null = null;
function schedule(ms: number): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(loop, ms);
}

function maybeHealUnsupported(): void {
  if (!reader?.attached || reader.supported) {
    healDueAt = 0;
    return;
  }
  const now = Date.now();
  if (healDueAt === 0) healDueAt = now + HEAL_UNSUPPORTED_MS;
  if (now >= healDueAt) {
    reader.healOffsets();
    postStatusIfChanged();
    healDueAt = now + HEAL_UNSUPPORTED_MS;
  }
}

function loop(): void {
  if (!reader) {
    postStatusIfChanged();
    schedule(POLL_DETACHED_MS);
    return;
  }
  if (!reader.attached) {
    reader.attach();
    postStatusIfChanged();
  } else {
    maybeHealUnsupported();
  }
  if (reader.attached && reader.supported) {
    const snap = reader.read();
    postStatusIfChanged();
    if (snap) {
      post({ type: "snapshot", snapshot: snap });
      schedule(POLL_ATTACHED_MS);
      return;
    }
  }
  schedule(reader.attached ? POLL_ATTACHED_MS : POLL_DETACHED_MS);
}

parentPort?.on("message", (msg) => {
  if (msg === "stop") {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    reader?.detach();
  }
});

postStatusIfChanged();
loop();
