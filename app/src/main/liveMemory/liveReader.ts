// Attaches read-only to the game, resolves offsets by version, and produces a
// live snapshot. Impure glue: the read algorithm lives in core/liveMemory; this
// wires it to the real koffi-backed WinProcess. utilityProcess only.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { offsetsForVersion, type LiveOffsets } from "../../core/liveMemory/offsets";
import {
  hasCriticalOffsets,
  isOffsetTableComplete,
  mergeOffsets,
  missingOffsetFields,
} from "../../core/liveMemory/offsetCompleteness";
import { extractOffsets } from "./offsetExtractor";
import { loadCachedOffsets, saveCachedOffsets } from "./offsetCache";
import { mayAttemptExtraction, recordExtractionAttempt } from "./offsetHealing";
import {
  makeChestLogPinState,
  makeGoldPinState,
  makeSmPinState,
  readRuntimeChestLog,
  readRuntimeGold,
  readRuntimeHeroes,
  readRuntimeInventory,
  readRuntimePets,
  readRuntimeStage,
  resolveStageManager,
  type ChestLogPinState,
  type GoldPinState,
  type SmPinState,
} from "../../core/liveMemory/runtime";
import type { LiveMemorySnapshot, LiveMemoryStatus } from "../../../shared/types";
import { WinProcess } from "./winProcess";

const PROCESS_NAMES = ["TaskBarHero.exe", "TaskbarHero.exe"];

/** Companion build id used to reset the extraction attempt budget on upgrade. */
function resolveAppBuild(): string {
  for (const rel of ["../../package.json", "../../../package.json"]) {
    try {
      const pkg = JSON.parse(readFileSync(join(__dirname, rel), "utf-8")) as { version?: string };
      if (pkg.version) return pkg.version;
    } catch {
      // try the next candidate
    }
  }
  return "unknown";
}

function gameAssembly(p: WinProcess): { base: bigint; size: number } | null {
  const m = p.listModules().find((mod) => /^gameassembly\.dll$/i.test(mod.name));
  return m ? { base: m.baseAddress, size: m.size } : null;
}

/** Read Version.txt next to the running exe (e.g. "1.00.21"). Returns version + install dir. */
function detectGameVersion(p: WinProcess): { version: string; installDir: string } | null {
  try {
    const exe = p.listModules().find((m) => /taskbarhero\.exe$/i.test(m.name))?.path;
    if (!exe) return null;
    const installDir = dirname(exe);
    const versionFile = join(installDir, "Version.txt");
    if (!existsSync(versionFile)) return null;
    const v = readFileSync(versionFile, "utf-8").trim();
    if (!/^\d+\.\d+\.\d+$/.test(v)) return null;
    return { version: v, installDir };
  } catch {
    return null;
  }
}

export class LiveMemoryReader {
  private proc: WinProcess | null = null;
  private ga: { base: bigint; size: number } | null = null;
  private offsets: LiveOffsets | null = null;
  private goldPin: GoldPinState = makeGoldPinState();
  private smPin: SmPinState = makeSmPinState();
  private chestPin: ChestLogPinState = makeChestLogPinState();
  private gameInstallDir: string | null = null;
  gameVersion: string | null = null;
  supported = false;

  get attached(): boolean {
    return this.proc != null && this.proc.isAlive();
  }

  get pid(): number | null {
    return this.proc?.pid ?? null;
  }

  /** Attach to the game and resolve version + offsets. Idempotent. */
  attach(appBuild: string = resolveAppBuild()): boolean {
    if (this.attached) return true;
    this.detach();
    const proc = WinProcess.findByNames(PROCESS_NAMES);
    if (!proc) return false;
    this.proc = proc;
    this.ga = gameAssembly(proc);
    const versionInfo = detectGameVersion(proc);
    this.gameVersion = versionInfo?.version ?? null;
    this.gameInstallDir = versionInfo?.installDir ?? null;

    this.offsets = this.resolveOffsets(proc, appBuild);
    this.supported = this.offsets != null && this.ga != null && hasCriticalOffsets(this.offsets);
    return true;
  }

  /**
   * Self-healing offset resolution:
   *   1. seed from the bundled table, else the disk cache;
   *   2. if the seed is missing OR incomplete (any wanted field still 0), and the
   *      per-version+build attempt budget is not exhausted, run the runtime
   *      extractor and MERGE its findings into the seed (filling only the gaps);
   *   3. persist the improved table so a future launch loads a complete cache.
   * The extractor is skipped only when the table is already complete — so a
   * game update (new version → empty cache) or a cached-but-partial table both
   * trigger derivation. The attempt cap stops us re-scanning forever when a
   * field is genuinely underivable with the current build.
   */
  private resolveOffsets(proc: WinProcess, appBuild: string): LiveOffsets | null {
    const ga = this.ga;
    const version = this.gameVersion;
    const dir = this.gameInstallDir;

    let base = offsetsForVersion(version);
    if (!base && dir && version) base = loadCachedOffsets(dir, version);

    const complete = base != null && isOffsetTableComplete(base);
    if (complete) return base;

    // Incomplete (or nothing) → attempt runtime derivation, budget permitting.
    if (ga && version && dir && mayAttemptExtraction(dir, version, appBuild)) {
      recordExtractionAttempt(dir, version, appBuild);
      const derived = extractOffsets(proc, ga, version);
      if (derived) {
        const merged = base ? mergeOffsets(base, derived) : derived;
        saveCachedOffsets(dir, merged);
        return merged;
      }
    }
    return base; // extraction unavailable/failed — use the seed (may be null)
  }

  detach(): void {
    this.proc?.close();
    this.proc = null;
    this.ga = null;
    this.offsets = null;
    this.supported = false;
    this.gameInstallDir = null;
    this.goldPin = makeGoldPinState(); // reset pins on detach — new attach needs fresh walks
    this.smPin = makeSmPinState();
    this.chestPin = makeChestLogPinState();
  }

  /** Live stage snapshot, or null when unattached/unsupported/unreadable. */
  read(): LiveMemorySnapshot | null {
    const p = this.proc;
    const o = this.offsets;
    const ga = this.ga;
    if (!p || !o || !ga) return null;
    if (!p.isAlive()) {
      this.detach();
      return null;
    }
    const t0 = Date.now();
    // Resolve the StageManager instance once per tick; heroes, wave, and box
    // count all read off it. Cached in smPin, re-scanned only when stale.
    const smPtr = resolveStageManager(p, ga.base, ga.size, o, this.smPin);
    const stage = readRuntimeStage(p, ga.base, ga.size, o, smPtr);
    if (!stage) return null;
    return {
      connected: true,
      stageKey: stage.stageKey,
      stageWave: stage.wave,
      gold: readRuntimeGold(p, ga.base, ga.size, o, this.goldPin),
      heroes: readRuntimeHeroes(p, o, smPtr),
      chestDrops: readRuntimeChestLog(p, ga.base, ga.size, o, this.chestPin),
      inventoryItems: readRuntimeInventory(p, ga.base, ga.size, o),
      petData: readRuntimePets(p, ga.base, ga.size, o),
      source: `memory v${o.gameVersion}`,
      readMs: Date.now() - t0,
      at: Date.now(),
    };
  }

  status(): LiveMemoryStatus {
    return {
      running: true,
      attached: this.attached,
      pid: this.pid,
      gameVersion: this.gameVersion,
      supported: this.supported,
      note:
        this.attached && !this.supported
          ? `live stats unavailable for game v${this.gameVersion ?? "?"}`
          : undefined,
      offsetHealth: this.offsets
        ? {
            complete: isOffsetTableComplete(this.offsets),
            missing: missingOffsetFields(this.offsets),
          }
        : undefined,
    };
  }
}
