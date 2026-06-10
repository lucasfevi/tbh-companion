import { app } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { buildStageBoxCatalog } from "../../core/stageBoxes";
import { loadRareBoxRoutesCatalog, rareRoutesById } from "../../core/boxes";
import type { BoxTimerCatalogEntry, BoxTimerRow, BoxTimerState } from "../../../shared/types";
import { IPC } from "../../../shared/ipc";
import { broadcast } from "./broadcast";

interface PersistedTimer {
  boxId: number;
  droppedAtMs: number;
}

interface PersistedFile {
  timers: PersistedTimer[];
  enabledBoxIds?: number[];
}

export class BoxTimerService {
  private readonly routes = loadRareBoxRoutesCatalog();
  private readonly routeById = rareRoutesById(this.routes);
  private readonly boxById = new Map(buildStageBoxCatalog().items.map((b) => [b.id, b]));
  private readonly routeBoxIds: number[];
  private timers = new Map<number, number>();
  private enabledBoxIds = new Set<number>();
  private tickTimer: NodeJS.Timeout | null = null;
  private subscribers = 0;
  private currentStageKey = 0;

  constructor() {
    this.routeBoxIds = [...this.routeById.keys()].sort(
      (a, b) => (this.boxById.get(a)?.level ?? 0) - (this.boxById.get(b)?.level ?? 0) || a - b,
    );
    this.load();
  }

  setCurrentStageKey(key: number): void {
    if (this.currentStageKey === key) return;
    this.currentStageKey = key;
    this.push();
  }

  startTick(): void {
    this.subscribers++;
    if (this.tickTimer) return;
    this.tickTimer = setInterval(() => this.push(), 1000);
  }

  stopTick(): void {
    this.subscribers = Math.max(0, this.subscribers - 1);
    if (this.subscribers > 0 || !this.tickTimer) return;
    clearInterval(this.tickTimer);
    this.tickTimer = null;
  }

  getState(): BoxTimerState {
    return this.buildState();
  }

  markDropped(boxId: number): BoxTimerState {
    if (!this.enabledBoxIds.has(boxId) || !this.routeById.has(boxId)) return this.buildState();
    this.timers.set(boxId, Date.now());
    this.persist();
    const state = this.buildState();
    broadcast(IPC.BOX_TIMERS, state);
    return state;
  }

  clearTimer(boxId: number): BoxTimerState {
    this.timers.delete(boxId);
    this.persist();
    const state = this.buildState();
    broadcast(IPC.BOX_TIMERS, state);
    return state;
  }

  /** Replace the visible timer set (e.g. preset chips). */
  setEnabledBoxIds(boxIds: number[]): BoxTimerState {
    const valid = boxIds.filter((id) => this.routeById.has(id));
    this.enabledBoxIds = new Set(valid);
    for (const boxId of [...this.timers.keys()]) {
      if (!this.enabledBoxIds.has(boxId)) this.timers.delete(boxId);
    }
    return this.commitState();
  }

  private commitState(): BoxTimerState {
    this.persist();
    const state = this.buildState();
    broadcast(IPC.BOX_TIMERS, state);
    return state;
  }

  push(): void {
    broadcast(IPC.BOX_TIMERS, this.buildState());
  }

  private buildCatalog(): BoxTimerCatalogEntry[] {
    return this.routeBoxIds.map((boxId) => {
      const box = this.boxById.get(boxId);
      const route = this.routeById.get(boxId);
      return {
        boxId,
        name: box?.name ?? `Box ${boxId}`,
        level: box?.level ?? null,
        idealStageLabel: route?.idealStageLabel ?? "—",
        enabled: this.enabledBoxIds.has(boxId),
      };
    });
  }

  private buildRow(boxId: number, now: number): BoxTimerRow {
    const box = this.boxById.get(boxId);
    const route = this.routeById.get(boxId);
    const cooldownSeconds = this.routes.cooldownSeconds;
    const droppedAt = this.timers.get(boxId);
    let remainingSeconds = 0;
    let active = false;
    let progress = 0;

    if (droppedAt !== undefined) {
      const elapsed = (now - droppedAt) / 1000;
      remainingSeconds = Math.max(0, Math.ceil(cooldownSeconds - elapsed));
      active = remainingSeconds > 0;
      progress = Math.min(1, elapsed / cooldownSeconds);
      if (!active) {
        this.timers.delete(boxId);
        this.persist();
      }
    }

    const idealStageKey = route?.idealStageKey ?? 0;
    const atIdealStage = idealStageKey > 0 && this.currentStageKey === idealStageKey;

    return {
      boxId,
      name: box?.name ?? `Box ${boxId}`,
      level: box?.level ?? null,
      idealStageKey,
      idealStageLabel: route?.idealStageLabel ?? "—",
      cooldownSeconds,
      active,
      remainingSeconds,
      progress,
      status: active ? "cooldown" : "ready",
      atIdealStage,
    };
  }

  private buildState(): BoxTimerState {
    const now = Date.now();
    const rows: BoxTimerRow[] = [];

    for (const boxId of this.routeBoxIds) {
      if (!this.enabledBoxIds.has(boxId)) continue;
      rows.push(this.buildRow(boxId, now));
    }

    rows.sort((a, b) => {
      if (a.status !== b.status) return a.status === "cooldown" ? -1 : 1;
      if (a.status === "cooldown") return a.remainingSeconds - b.remainingSeconds;
      return (a.level ?? 0) - (b.level ?? 0) || a.boxId - b.boxId;
    });

    const readyCount = rows.filter((r) => r.status === "ready").length;
    const cooldownCount = rows.filter((r) => r.status === "cooldown").length;

    return {
      rows,
      catalog: this.buildCatalog(),
      enabledCount: this.enabledBoxIds.size,
      readyCount,
      cooldownCount,
      currentStageKey: this.currentStageKey,
      disclaimer: this.routes.disclaimer,
    };
  }

  private defaultEnabledIds(): number[] {
    const preferred = [920151, 920201, 920301, 920401];
    const picked = preferred.filter((id) => this.routeById.has(id));
    return picked.length > 0 ? picked : this.routeBoxIds.slice(0, 4);
  }

  private persistPath(): string {
    try {
      return join(app.getPath("userData"), "box_timers.json");
    } catch {
      return join(process.cwd(), "box_timers.json");
    }
  }

  private load(): void {
    const path = this.persistPath();
    if (!existsSync(path)) {
      for (const id of this.defaultEnabledIds()) this.enabledBoxIds.add(id);
      return;
    }
    try {
      const raw = JSON.parse(readFileSync(path, "utf-8")) as PersistedFile;
      for (const t of raw.timers ?? []) {
        if (t.boxId && t.droppedAtMs) this.timers.set(t.boxId, t.droppedAtMs);
      }
      const enabled = raw.enabledBoxIds?.filter((id) => this.routeById.has(id)) ?? [];
      if (enabled.length > 0) {
        for (const id of enabled) this.enabledBoxIds.add(id);
      } else {
        for (const id of this.defaultEnabledIds()) this.enabledBoxIds.add(id);
      }
    } catch {
      for (const id of this.defaultEnabledIds()) this.enabledBoxIds.add(id);
    }
  }

  private persist(): void {
    const path = this.persistPath();
    mkdirSync(dirname(path), { recursive: true });
    const timers: PersistedTimer[] = [...this.timers.entries()].map(([boxId, droppedAtMs]) => ({
      boxId,
      droppedAtMs,
    }));
    writeFileSync(
      path,
      JSON.stringify({ timers, enabledBoxIds: [...this.enabledBoxIds] }, null, 2),
    );
  }
}
