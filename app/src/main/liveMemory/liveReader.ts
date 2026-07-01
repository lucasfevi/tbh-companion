// Attaches read-only to the game, resolves offsets by version, and produces a
// live snapshot. Impure glue: the read algorithm lives in core/liveMemory; this
// wires it to the real koffi-backed WinProcess. utilityProcess only.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { offsetsForVersion, type LiveOffsets } from "../../core/liveMemory/offsets";
import {
  makeGoldPinState,
  readRuntimeBoxCount,
  readRuntimeGold,
  readRuntimeHeroes,
  readRuntimeStage,
  type GoldPinState,
} from "../../core/liveMemory/runtime";
import type { LiveMemorySnapshot, LiveMemoryStatus } from "../../../shared/types";
import { WinProcess } from "./winProcess";

const PROCESS_NAMES = ["TaskBarHero.exe", "TaskbarHero.exe"];

function gameAssembly(p: WinProcess): { base: bigint; size: number } | null {
  const m = p.listModules().find((mod) => /^gameassembly\.dll$/i.test(mod.name));
  return m ? { base: m.baseAddress, size: m.size } : null;
}

/** Read Version.txt next to the running exe (e.g. "1.00.21"). */
function detectGameVersion(p: WinProcess): string | null {
  try {
    const exe = p.listModules().find((m) => /taskbarhero\.exe$/i.test(m.name))?.path;
    if (!exe) return null;
    const versionFile = join(dirname(exe), "Version.txt");
    if (!existsSync(versionFile)) return null;
    const v = readFileSync(versionFile, "utf-8").trim();
    return /^\d+\.\d+\.\d+$/.test(v) ? v : null;
  } catch {
    return null;
  }
}

export class LiveMemoryReader {
  private proc: WinProcess | null = null;
  private ga: { base: bigint; size: number } | null = null;
  private offsets: LiveOffsets | null = null;
  private goldPin: GoldPinState = makeGoldPinState();
  gameVersion: string | null = null;
  supported = false;

  get attached(): boolean {
    return this.proc != null && this.proc.isAlive();
  }

  get pid(): number | null {
    return this.proc?.pid ?? null;
  }

  /** Attach to the game and resolve version + offsets. Idempotent. */
  attach(): boolean {
    if (this.attached) return true;
    this.detach();
    const proc = WinProcess.findByNames(PROCESS_NAMES);
    if (!proc) return false;
    this.proc = proc;
    this.ga = gameAssembly(proc);
    this.gameVersion = detectGameVersion(proc);
    this.offsets = offsetsForVersion(this.gameVersion);
    this.supported = this.offsets != null && this.ga != null;
    return true;
  }

  detach(): void {
    this.proc?.close();
    this.proc = null;
    this.ga = null;
    this.offsets = null;
    this.supported = false;
    this.goldPin = makeGoldPinState(); // reset pin on detach — new attach needs a fresh walk
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
    const stage = readRuntimeStage(p, ga.base, ga.size, o);
    if (!stage) return null;
    return {
      connected: true,
      stageKey: stage.stageKey,
      stageWave: stage.wave,
      gold: readRuntimeGold(p, ga.base, ga.size, o, this.goldPin),
      heroes: readRuntimeHeroes(p, ga.base, ga.size, o),
      boxCount: readRuntimeBoxCount(p, ga.base, ga.size, o),
      inventoryItems: null, // wired in T09
      petData: null,        // wired in T10
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
    };
  }
}
