#!/usr/bin/env node
/**
 * Partial dev smoke — start electron-vite dev, watch logs, probe Vite.
 * Does not replace visual UI checks. Usage: pnpm qa:dev (from app/)
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const WAIT_MS = 45_000;
const VITE_URL = "http://localhost:5173/";

const LOG_FAIL_PATTERNS = [
  /error during build/i,
  /Build failed/i,
  /Could not resolve/i,
  /Cannot find module/i,
  /SyntaxError/i,
  /FAIL:/i,
  /ELIFECYCLE/i,
];

function killTree(proc) {
  if (!proc?.pid) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(proc.pid), "/f", "/t"], { shell: true, stdio: "ignore" });
  } else {
    proc.kill("SIGTERM");
  }
}

function scanLog(text) {
  for (const re of LOG_FAIL_PATTERNS) {
    const m = text.match(re);
    if (m) return m[0];
  }
  return null;
}

async function waitForReady(getText) {
  const deadline = Date.now() + WAIT_MS;
  while (Date.now() < deadline) {
    const text = getText();
    const err = scanLog(text);
    if (err) throw new Error(`Dev log error: ${err}`);
    if (text.includes("starting electron app") || text.includes("Local:")) {
      return text;
    }
    await sleep(500);
  }
  throw new Error(`Dev did not become ready within ${WAIT_MS / 1000}s`);
}

async function probeVite() {
  for (let i = 0; i < 10; i++) {
    try {
      const res = await fetch(VITE_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      if (!html.includes("root") && !html.includes("/@vite/client")) {
        throw new Error("Unexpected Vite HTML (missing root or vite client)");
      }
      return;
    } catch (e) {
      if (i === 9) throw e;
      await sleep(1000);
    }
  }
}

console.log("Starting dev server for automated smoke (up to 45s)...\n");

const proc = spawn("pnpm", ["run", "dev"], {
  cwd: appRoot,
  shell: true,
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, FORCE_COLOR: "0" },
});

let log = "";
proc.stdout?.on("data", (d) => {
  const s = d.toString();
  log += s;
  process.stdout.write(s);
});
proc.stderr?.on("data", (d) => {
  const s = d.toString();
  log += s;
  process.stderr.write(s);
});

let exitCode = 1;
try {
  await waitForReady(() => log);
  await probeVite();
  console.log("\nqa:dev passed (dev started, Vite responded, no build errors in log).");
  console.log("Visual tab smoke still recommended — run pnpm dev and confirm UI is not blank.");
  exitCode = 0;
} catch (err) {
  console.error(`\nqa:dev FAILED: ${err.message}`);
  const tail = scanLog(log);
  if (tail) console.error(`Matched log pattern: ${tail}`);
  exitCode = 1;
} finally {
  killTree(proc);
  await sleep(2000);
  process.exit(exitCode);
}
