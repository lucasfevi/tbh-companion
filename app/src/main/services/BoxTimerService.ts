import { app } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { buildStageBoxCatalog } from "../../core/stageBoxes";
import {
  loadStageBoxCatalogFile,
  loadStageBoxTrackerRoutes,
  resolveTrackedDropBoxId,
  trackerRoutesById,
  type StageBoxTrackerRoute,
} from "../../core/stageBoxTracker";
import { stageName } from "../../core/stages";
import type {
  BoxTimerCatalogEntry,
  BoxTimerFarmStageOption,
  BoxTimerRow,
  BoxTimerState,
} from "../../../shared/types";
import { IPC } from "../../../shared/ipc";
import { broadcast } from "./broadcast";
import { createLogger } from "../log";

const log = createLogger("boxTimers");

interface PersistedTimer {
  boxId: number;
  droppedAtMs: number;
}

interface PersistedFile {
  timers: PersistedTimer[];
  enabledBoxIds?: number[];
  cooldownSecondsByBoxId?: Record<string, number>;
  idealStageKeyByBoxId?: Record<string, number>;
}

export class BoxTimerService {
  private readonly catalogFile = loadStageBoxCatalogFile();
  private readonly routes = loadStageBoxTrackerRoutes();
  private readonly routeById = trackerRoutesById(this.routes);
  private readonly boxById = new Map(buildStageBoxCatalog().items.map((b) => [b.id, b]));
  private readonly routeBoxIds: number[];
  private timers = new Map<number, number>();
  private enabledBoxIds = new Set<number>();
  private cooldownSecondsByBoxId = new Map<number, number>();
  private idealStageKeyByBoxId = new Map<number, number>();
  private tickTimer: NodeJS.Timeout | null = null;
  private subscribers = 0;
  private currentStageKey = 0;
  private playerLogPath = "";
  private playerLogAvailable = false;

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
    if (!this.isEnabledRoute(boxId)) return this.buildState();
    this.timers.set(boxId, Date.now());
    return this.commitState();
  }

  /** Start cooldown when Player.log reports a tracked stage boss box drop. */
  tryMarkDroppedFromLog(itemKey: number): boolean {
    const boxId = resolveTrackedDropBoxId(
      itemKey,
      this.enabledBoxIds,
      (id) => this.routeById.has(id),
      this.catalogFile,
    );
    if (boxId == null) return false;

    log.info(
      `Stage boss drop detected from Player.log (ItemKey ${itemKey} → Lv${this.boxById.get(boxId)?.level ?? "?"})`,
    );
    this.markDropped(boxId);
    return true;
  }

  setPlayerLogStatus(path: string, available: boolean): void {
    if (this.playerLogPath === path && this.playerLogAvailable === available) return;
    this.playerLogPath = path;
    this.playerLogAvailable = available;
    this.push();
  }

  clearTimer(boxId: number): BoxTimerState {
    this.timers.delete(boxId);
    return this.commitState();
  }

  setCooldownSeconds(boxId: number, cooldownSeconds: number): BoxTimerState {
    if (!this.routeById.has(boxId)) return this.buildState();
    const seconds = Math.max(60, Math.min(86_400, Math.round(cooldownSeconds)));
    this.cooldownSecondsByBoxId.set(boxId, seconds);
    return this.commitState();
  }

  clearCooldownOverride(boxId: number): BoxTimerState {
    this.cooldownSecondsByBoxId.delete(boxId);
    return this.commitState();
  }

  setFarmStageKey(boxId: number, stageKey: number): BoxTimerState {
    const route = this.routeById.get(boxId);
    if (!route || !route.dropStageKeys.includes(stageKey)) return this.buildState();
    if (stageKey === route.idealStageKey) {
      this.idealStageKeyByBoxId.delete(boxId);
    } else {
      this.idealStageKeyByBoxId.set(boxId, stageKey);
    }
    return this.commitState();
  }

  clearFarmStageOverride(boxId: number): BoxTimerState {
    this.idealStageKeyByBoxId.delete(boxId);
    return this.commitState();
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

  /** Reset timers and enabled routes after box_timers.json was deleted. */
  resetStorage(): BoxTimerState {
    this.timers.clear();
    this.enabledBoxIds.clear();
    this.cooldownSecondsByBoxId.clear();
    this.idealStageKeyByBoxId.clear();
    for (const id of this.defaultEnabledIds()) this.enabledBoxIds.add(id);
    return this.commitState();
  }

  private isEnabledRoute(boxId: number): boolean {
    return this.routeById.has(boxId) && this.enabledBoxIds.has(boxId);
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

  private resolveCooldownSeconds(boxId: number): number {
    return this.cooldownSecondsByBoxId.get(boxId) ?? this.catalogFile.defaultCooldownSeconds ?? 720;
  }

  private resolveFarmStage(boxId: number): {
    key: number;
    label: string;
    defaultKey: number;
    defaultLabel: string;
    isCustom: boolean;
    options: BoxTimerFarmStageOption[];
  } {
    const route = this.routeById.get(boxId);
    const defaultKey = route?.idealStageKey ?? 0;
    const defaultLabel = defaultKey > 0 ? stageName(defaultKey) : "—";
    const override = this.idealStageKeyByBoxId.get(boxId);
    const key = override ?? defaultKey;
    const options = this.buildFarmStageOptions(route);
    return {
      key,
      label: key > 0 ? stageName(key) : "—",
      defaultKey,
      defaultLabel,
      isCustom: override != null,
      options,
    };
  }

  private buildFarmStageOptions(
    route: StageBoxTrackerRoute | undefined,
  ): BoxTimerFarmStageOption[] {
    if (!route) return [];
    const wikiKey = route.idealStageKey;
    return route.dropStageKeys.map((stageKey) => ({
      stageKey,
      label: stageKey === wikiKey ? `${stageName(stageKey)} (recommended)` : stageName(stageKey),
    }));
  }

  private buildCatalog(): BoxTimerCatalogEntry[] {
    return this.routeBoxIds.map((boxId) => {
      const box = this.boxById.get(boxId);
      const route = this.routeById.get(boxId);
      const farm = this.resolveFarmStage(boxId);
      return {
        boxId,
        name: box?.name ?? `Box ${boxId}`,
        level: box?.level ?? null,
        idealStageKey: farm.key,
        idealStageLabel: farm.label,
        defaultIdealStageKey: farm.defaultKey,
        defaultIdealStageLabel: farm.defaultLabel,
        idealStageIsCustom: farm.isCustom,
        farmStageOptions: farm.options,
        dropStageRangeLabel: route?.dropStageRangeLabel ?? "—",
        cooldownSeconds: this.resolveCooldownSeconds(boxId),
        cooldownIsCustom: this.cooldownSecondsByBoxId.has(boxId),
        enabled: this.enabledBoxIds.has(boxId),
      };
    });
  }

  private buildRow(boxId: number, now: number): BoxTimerRow {
    const box = this.boxById.get(boxId);
    const cooldownSeconds = this.resolveCooldownSeconds(boxId);
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

    const farm = this.resolveFarmStage(boxId);
    const atIdealStage = farm.key > 0 && this.currentStageKey === farm.key;

    return {
      boxId,
      name: box?.name ?? `Box ${boxId}`,
      level: box?.level ?? null,
      idealStageKey: farm.key,
      idealStageLabel: farm.label,
      cooldownSeconds,
      cooldownIsCustom: this.cooldownSecondsByBoxId.has(boxId),
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
      defaultCooldownSeconds: this.catalogFile.defaultCooldownSeconds ?? 720,
      playerLogPath: this.playerLogPath,
      playerLogAvailable: this.playerLogAvailable,
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
      for (const [boxId, seconds] of Object.entries(raw.cooldownSecondsByBoxId ?? {})) {
        const id = Number(boxId);
        if (id > 0 && seconds > 0 && this.routeById.has(id)) {
          this.cooldownSecondsByBoxId.set(id, seconds);
        }
      }
      for (const [boxId, stageKey] of Object.entries(raw.idealStageKeyByBoxId ?? {})) {
        const id = Number(boxId);
        const key = Number(stageKey);
        const route = this.routeById.get(id);
        if (id > 0 && key > 0 && route?.dropStageKeys.includes(key)) {
          if (key === route.idealStageKey) continue;
          this.idealStageKeyByBoxId.set(id, key);
        }
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
    const cooldownSecondsByBoxId = Object.fromEntries(this.cooldownSecondsByBoxId);
    const idealStageKeyByBoxId = Object.fromEntries(this.idealStageKeyByBoxId);
    writeFileSync(
      path,
      JSON.stringify(
        {
          timers,
          enabledBoxIds: [...this.enabledBoxIds],
          cooldownSecondsByBoxId,
          idealStageKeyByBoxId,
        },
        null,
        2,
      ),
    );
  }
}
