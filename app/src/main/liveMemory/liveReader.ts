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
import { extractionAttempts, mayAttemptExtraction, recordExtractionAttempt } from "./offsetHealing";
import {
  resolveLiveMemoryOffsetCacheDir,
  resolveLiveMemoryUserDataDir,
} from "./liveMemoryCacheDir";
import {
  makeChestLogPinState,
  makeGoldPinState,
  makeSmPinState,
  makeStageClearPinState,
  readRuntimeChestLog,
  readRuntimeGold,
  readRuntimeHeroes,
  readRuntimeInventory,
  readRuntimePets,
  readRuntimeStage,
  readRuntimeStageClears,
  resolveStageManager,
  type ChestLogPinState,
  type GoldPinState,
  type SmPinState,
  type StageClearPinState,
} from "../../core/liveMemory/runtime";
import type { LiveMemorySnapshot, LiveMemoryStatus } from "../../../shared/types";
import { WinProcess } from "./winProcess";

const PROCESS_NAMES = ["TaskBarHero.exe", "TaskbarHero.exe"];

export type LiveMemoryLogFn = (message: string) => void;
export type OffsetResolutionSource = "bundled" | "cache" | "extracted" | "merged" | "none";

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
  private offsetSource: OffsetResolutionSource = "none";
  private goldPin: GoldPinState = makeGoldPinState();
  private smPin: SmPinState = makeSmPinState();
  private chestPin: ChestLogPinState = makeChestLogPinState();
  private stageClearPin: StageClearPinState = makeStageClearPinState();
  private gameInstallDir: string | null = null;
  private readonly userDataDir: string;
  private log: LiveMemoryLogFn = () => undefined;
  gameVersion: string | null = null;
  supported = false;

  constructor(userDataDir: string = resolveLiveMemoryUserDataDir()) {
    this.userDataDir = userDataDir;
  }

  private offsetCacheDir(): string | null {
    if (!this.gameInstallDir) return null;
    return resolveLiveMemoryOffsetCacheDir(this.userDataDir, this.gameInstallDir);
  }

  /** Wire a logger (utilityProcess posts these to the main process). */
  setLogger(fn: LiveMemoryLogFn): void {
    this.log = fn;
  }

  get attached(): boolean {
    return this.proc != null && this.proc.isAlive();
  }

  get pid(): number | null {
    return this.proc?.pid ?? null;
  }

  /** Attach to the game and resolve version + offsets. Idempotent. */
  attach(appBuild: string = resolveAppBuild()): boolean {
    if (this.attached) {
      this.healOffsets(appBuild);
      return true;
    }
    this.detach();
    const proc = WinProcess.findByNames(PROCESS_NAMES);
    if (!proc) {
      this.log("attach: game process not found");
      return false;
    }
    this.proc = proc;
    this.refreshGameContext();
    this.log(
      `attach: pid=${proc.pid} version=${this.gameVersion ?? "?"} ga=${this.ga ? "ok" : "missing"}`,
    );
    this.applyResolvedOffsets(this.resolveOffsets(proc, appBuild), appBuild);
    return true;
  }

  /**
   * Re-run offset resolution while already attached — used when the first attempt
   * happened too early (menu / singletons not up) or the extractor shipped an
   * improvement and the attempt budget reopened.
   */
  healOffsets(appBuild: string = resolveAppBuild()): void {
    const proc = this.proc;
    if (!proc?.isAlive()) return;

    const wasSupported = this.supported;
    this.refreshGameContext();
    const resolved = this.resolveOffsets(proc, appBuild);
    this.applyResolvedOffsets(resolved, appBuild);

    if (!wasSupported && this.supported) {
      this.log(`heal: offsets now supported (source=${this.offsetSource})`);
    } else if (!this.supported) {
      const missing = this.offsets
        ? missingOffsetFields(this.offsets, "critical").join(", ")
        : "no table";
      this.log(`heal: still unsupported — source=${this.offsetSource} critical=${missing}`);
    }
  }

  private refreshGameContext(): void {
    const proc = this.proc;
    if (!proc) return;
    const versionInfo = detectGameVersion(proc);
    this.gameVersion = versionInfo?.version ?? this.gameVersion;
    this.gameInstallDir = versionInfo?.installDir ?? this.gameInstallDir;
    this.ga = gameAssembly(proc);
  }

  private applyResolvedOffsets(
    resolved: { table: LiveOffsets | null; source: OffsetResolutionSource },
    appBuild: string,
  ): void {
    this.offsets = resolved.table;
    this.offsetSource = resolved.source;
    this.supported = this.offsets != null && this.ga != null && hasCriticalOffsets(this.offsets);
    if (!this.supported && this.attached) {
      const missing = this.offsets
        ? missingOffsetFields(this.offsets, "critical").join(", ")
        : "no table";
      const cacheDir = this.offsetCacheDir();
      const attempts =
        cacheDir && this.gameVersion ? extractionAttempts(cacheDir, this.gameVersion, appBuild) : 0;
      this.log(
        `offsets: unsupported for v${this.gameVersion ?? "?"} (source=${resolved.source}, critical missing: ${missing}, extract attempts=${attempts})`,
      );
    }
  }

  /**
   * Self-healing offset resolution:
   *   1. seed from the bundled table, else the disk cache;
   *   2. if the seed is missing OR incomplete (any wanted field still 0), and the
   *      per-version+build attempt budget is not exhausted, run the runtime
   *      extractor and MERGE its findings into the seed (filling only the gaps);
   *   3. persist the improved table so a future launch loads a complete cache.
   */
  private resolveOffsets(
    proc: WinProcess,
    appBuild: string,
  ): { table: LiveOffsets | null; source: OffsetResolutionSource } {
    const ga = this.ga;
    const version = this.gameVersion;
    const cacheDir = this.offsetCacheDir();

    let base: LiveOffsets | null = null;
    let source: OffsetResolutionSource = "none";

    const bundled = offsetsForVersion(version);
    if (bundled) {
      base = bundled;
      source = "bundled";
      this.log(`resolve: bundled table for v${version}`);
    } else if (cacheDir && version) {
      const cached = loadCachedOffsets(cacheDir, version);
      if (cached) {
        base = cached;
        source = "cache";
        this.log(`resolve: loaded disk cache for v${version}`);
      }
    }

    const complete = base != null && isOffsetTableComplete(base);
    if (complete) {
      this.log(`resolve: table complete (source=${source})`);
      return { table: base, source };
    }

    const missing = base ? missingOffsetFields(base).join(", ") : "entire table";
    this.log(`resolve: incomplete — missing ${missing}`);

    if (ga && version && cacheDir && mayAttemptExtraction(cacheDir, version, appBuild)) {
      recordExtractionAttempt(cacheDir, version, appBuild);
      this.log(
        `resolve: running extractor (attempt ${extractionAttempts(cacheDir, version, appBuild)}/${3})`,
      );
      const derived = extractOffsets(proc, ga, version, (msg) => this.log(msg));
      if (derived) {
        const merged = base ? mergeOffsets(base, derived) : derived;
        saveCachedOffsets(cacheDir, merged);
        const mergedSource: OffsetResolutionSource = base ? "merged" : "extracted";
        this.log(`resolve: extractor ok → ${mergedSource}, persisted cache`);
        return { table: merged, source: mergedSource };
      }
      this.log("resolve: extractor returned null (critical anchor failed)");
    } else if (ga && version && cacheDir) {
      this.log(
        `resolve: extractor skipped (budget exhausted: ${extractionAttempts(cacheDir, version, appBuild)} attempts)`,
      );
    } else {
      this.log("resolve: extractor skipped (missing ga, version, or install dir)");
    }

    return { table: base, source };
  }

  detach(): void {
    this.proc?.close();
    this.proc = null;
    this.ga = null;
    this.offsets = null;
    this.offsetSource = "none";
    this.supported = false;
    this.gameInstallDir = null;
    this.goldPin = makeGoldPinState();
    this.smPin = makeSmPinState();
    this.chestPin = makeChestLogPinState();
    this.stageClearPin = makeStageClearPinState();
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
      stageClears: readRuntimeStageClears(p, ga.base, ga.size, o, this.stageClearPin),
      inventoryItems: readRuntimeInventory(p, ga.base, ga.size, o),
      petData: readRuntimePets(p, ga.base, ga.size, o),
      source: `memory v${o.gameVersion}`,
      readMs: Date.now() - t0,
      at: Date.now(),
    };
  }

  status(appBuild: string = resolveAppBuild()): LiveMemoryStatus {
    const cacheDir = this.offsetCacheDir();
    const attempts =
      cacheDir && this.gameVersion
        ? extractionAttempts(cacheDir, this.gameVersion, appBuild)
        : undefined;
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
            source: this.offsetSource,
            extractionAttempts: attempts,
          }
        : this.attached
          ? {
              complete: false,
              missing: [],
              source: this.offsetSource,
              extractionAttempts: attempts,
            }
          : undefined,
    };
  }
}
