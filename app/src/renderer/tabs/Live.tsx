import { useEffect, useState, type ReactNode } from "react";
import { useStats } from "../lib/useStats";
import { useInventory } from "../lib/useInventory";
import { useChests } from "../lib/useChests";
import {
  fmtCompact,
  fmtDuration,
  fmtXpUpdated,
  fmtClock,
  fmtHoursUntilFull,
  fmtFillEta,
} from "../lib/format";
import { predictFillTime, type ChestFillSource } from "../../core/inventory/predictFillTime";
import { reportIpcError } from "../lib/reportError";
import { stageName } from "../../core/stages";
import { Button } from "../design-system/primitives/Button/Button";
import { DataListRow } from "../design-system/primitives/DataList/DataList";
import { Field } from "../design-system/primitives/Field/Field";
import { PanelSection } from "../design-system/primitives/PanelSection/PanelSection";
import { StatCard } from "../design-system/primitives/StatCard/StatCard";
import { TabMetricHero } from "../design-system/primitives/TabMetricHero/TabMetricHero";
import { TabHeader } from "../design-system/primitives/TabHeader/TabHeader";
import { TabPage } from "../design-system/primitives/TabPage/TabPage";
import { ChestDropPanel } from "../components/live/ChestDropPanel";
import { LiveHistoryPanel } from "../components/live/LiveHistoryPanel";
import { LiveMatchedPair } from "../components/live/LiveMatchedPair";
import { LivePanelList } from "../components/live/LivePanelList";
import { LiveChestStatValue } from "../lib/liveChestStat";
import { cn } from "../lib/cn";
import type { ChestAutoOpenPrefs } from "../../../shared/types";

const IDLE_THRESHOLD = 120;

const DEFAULT_AUTO_OPEN: ChestAutoOpenPrefs = { common: false, stageBoss: false };

const RATE_TIP =
  "XP/hour updates only when the game writes new XP to the save (often up to " +
  "3 minutes apart, sometimes longer). It holds steady between writes instead of decaying.";
const GOLD_TIP =
  "Gold earned per hour. Counts gold gained only; spending (upgrades, Cube, " +
  "runes) is ignored, so it's accurate while farming.";
const CHEST_RATE_TIP =
  "Drop rates from Player.log lines this session. Only counts while the companion is running.";
const INVENTORY_PREDICTION_TIP =
  "Estimates when your unlocked inventory slots fill up. For each chest type you've marked " +
  "auto-open below, we model a serial auto-open queue: held chests drain at their open speed " +
  "(faster with reduction runes) while Player.log drops add more chests to the queue. Each " +
  "opened chest uses one inventory slot. We can't detect the in-game auto-open toggle, so set " +
  "it here — only common and stage boss chests count, since Player.log doesn't report act boss " +
  "drops. Based on the save file, so it can take a few minutes to catch up after you change a " +
  "toggle or open chests in-game.";

export function Live() {
  const stats = useStats();
  const inventory = useInventory();
  const chests = useChests();
  const [autoOpenEnabled, setAutoOpenEnabled] = useState<ChestAutoOpenPrefs>(DEFAULT_AUTO_OPEN);

  useEffect(() => {
    if (typeof window.tbh?.getConfig !== "function") return;

    const syncAutoOpenPrefs = (): void => {
      void window.tbh
        .getConfig()
        .then((config) => setAutoOpenEnabled(config.chestAutoOpenEnabled))
        .catch(reportIpcError);
    };

    syncAutoOpenPrefs();

    const onVisibilityChange = (): void => {
      if (document.visibilityState === "visible") syncAutoOpenPrefs();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  function toggleAutoOpen(key: keyof ChestAutoOpenPrefs, checked: boolean): void {
    const previous = autoOpenEnabled;
    const next = { ...previous, [key]: checked };
    setAutoOpenEnabled(next);
    void window.tbh.saveConfig({ chestAutoOpenEnabled: next }).catch((err: unknown) => {
      reportIpcError(err);
      setAutoOpenEnabled(previous);
    });
  }

  if (!stats) {
    return (
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-lg font-semibold">Live stats</h1>
        <p className="m-0 text-muted">Connecting to the save file...</p>
      </div>
    );
  }

  const idle = stats.secondsSinceGain !== null && stats.secondsSinceGain > IDLE_THRESHOLD;
  const showStatus = stats.status !== "Tracking";
  const { commonTotal, rareTotal, commonPerHour, rarePerHour, playerLogAvailable } =
    stats.chestDrops;
  const chestStatsInactive = !playerLogAvailable;

  const fillSources: ChestFillSource[] = [];
  if (chests && autoOpenEnabled.common) {
    fillSources.push({
      heldChests: chests.common.quantity,
      autoOpenSecondsPerChest: chests.autoOpen.common,
      dropsPerHour: commonPerHour,
    });
  }
  if (chests && autoOpenEnabled.stageBoss) {
    fillSources.push({
      heldChests: chests.stageBoss.quantity,
      autoOpenSecondsPerChest: chests.autoOpen.stageBoss,
      dropsPerHour: rarePerHour,
    });
  }

  const fillPrediction =
    inventory && chests
      ? predictFillTime({
          inventoryCapacity: inventory.inventoryCapacity,
          inventoryUsed: inventory.inventoryUsed,
          sources: fillSources,
        })
      : null;

  const renderFillEstimate = (): ReactNode => {
    if (fillPrediction?.hoursUntilFull === null) {
      return "Turn on an auto-open toggle below and play a session to estimate when it'll be full.";
    }
    if (fillPrediction && fillPrediction.hoursUntilFull !== null) {
      return (
        <>
          Full in about{" "}
          <span className="font-semibold text-fg">
            {fmtHoursUntilFull(fillPrediction.hoursUntilFull)}
          </span>{" "}
          — around{" "}
          <span className="font-semibold text-fg">{fmtFillEta(fillPrediction.hoursUntilFull)}</span>
          .
        </>
      );
    }
    return null;
  };

  return (
    <TabPage>
      <TabHeader
        title="Live stats"
        intro="Reads your save on a timer. XP and gold rates update when the game writes new progress—often up to three minutes apart, sometimes longer."
      />

      <TabMetricHero
        primary={
          <div className="flex cursor-help items-baseline gap-2" title={RATE_TIP}>
            <span className="text-[40px] font-bold leading-none text-accent">
              {fmtCompact(stats.rollingRate)}
            </span>
            <span className="text-[13px] tracking-wide text-muted">XP / hr</span>
          </div>
        }
        center={
          <>
            <div
              className="cursor-help text-[15px] font-semibold leading-tight text-gold"
              title={GOLD_TIP}
            >
              {fmtCompact(stats.goldRate)} gold / hr
            </div>
            <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs text-muted">
              <span>
                Map{" "}
                <b className="font-semibold text-fg">
                  {stageName(stats.stageKey, stats.stageWave)}
                </b>
              </span>
              <span
                title={
                  stats.secondsSinceGain === null
                    ? "Connected and reading your save. Rates update when the game writes progress."
                    : "When XP last changed in your save"
                }
              >
                <b className="font-semibold text-fg">{fmtXpUpdated(stats.secondsSinceGain)}</b>
              </span>
            </div>
          </>
        }
        action={
          <Button size="sm" title="Reset session stats" onClick={() => window.tbh.reset()}>
            {"\u21bb"} Reset
          </Button>
        }
      />

      <section className="grid grid-cols-3 gap-2.5">
        <StatCard label="Session XP" value={fmtCompact(stats.cumulativeGained)} />
        <StatCard label="Session gold" value={fmtCompact(stats.goldGained)} />
        <StatCard label="Elapsed" value={fmtDuration(stats.elapsed)} />
        <StatCard label="Session XP/hr" value={fmtCompact(stats.sessionRate)} />
        <StatCard
          label="Common chests"
          value={
            <LiveChestStatValue
              total={commonTotal}
              perHour={commonPerHour}
              inactive={chestStatsInactive}
            />
          }
          title={CHEST_RATE_TIP}
        />
        <StatCard
          label="Stage boss chests"
          value={
            <LiveChestStatValue
              total={rareTotal}
              perHour={rarePerHour}
              countClassName="text-status-info"
              inactive={chestStatsInactive}
            />
          }
          title={CHEST_RATE_TIP}
        />
      </section>

      <ChestDropPanel chestDrops={stats.chestDrops} />

      <PanelSection
        title={
          <span className="inline-flex items-center gap-1.5">
            Inventory fill prediction
            <span
              className="inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-border text-[10px] normal-case leading-none tracking-normal text-muted"
              title={INVENTORY_PREDICTION_TIP}
            >
              ?
            </span>
          </span>
        }
        boxed
        className="max-w-lg"
        contentClassName="flex flex-col gap-3 p-3"
      >
        <div className="flex flex-col gap-1.5 text-[13px] text-muted">
          {inventory && inventory.inventoryCapacity > 0 ? (
            <p className="m-0">
              Inventory:{" "}
              <span className="font-semibold text-fg">
                {inventory.inventoryUsed}/{inventory.inventoryCapacity}
              </span>{" "}
              slots used.
            </p>
          ) : null}
          {/* min-h reserves room for the longer "turn on a toggle" message so swapping
              between states doesn't resize the card. */}
          <p className="m-0 min-h-[2.6em]">{renderFillEstimate()}</p>
          {/* Always mounted (invisible when empty) so toggling held chests in/out
              doesn't change the card's height. */}
          <p
            className={cn(
              "m-0",
              (!fillPrediction || fillPrediction.heldChestItems <= 0) && "invisible",
            )}
          >
            Includes{" "}
            <span className="font-semibold text-fg">{fillPrediction?.heldChestItems ?? 0}</span>{" "}
            held chest{fillPrediction?.heldChestItems === 1 ? "" : "s"} waiting to auto-open.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-3">
          <Field label="Common chests auto-open" checkbox>
            <input
              type="checkbox"
              checked={autoOpenEnabled.common}
              onChange={(e) => toggleAutoOpen("common", e.target.checked)}
            />
          </Field>
          <Field label="Stage boss chests auto-open" checkbox>
            <input
              type="checkbox"
              checked={autoOpenEnabled.stageBoss}
              onChange={(e) => toggleAutoOpen("stageBoss", e.target.checked)}
            />
          </Field>
        </div>
      </PanelSection>

      <LiveMatchedPair
        left={
          <PanelSection title="Heroes" boxed>
            <LivePanelList empty={stats.heroes.length === 0 ? "No active heroes yet." : undefined}>
              {stats.heroes.map((h, i) => (
                <DataListRow
                  key={h.key}
                  index={i}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-3"
                >
                  <span className="font-semibold">{h.name}</span>
                  <span className="text-muted">Lv {h.level}</span>
                  <span className="tabular-nums text-accent">{fmtCompact(h.rate)}/hr</span>
                </DataListRow>
              ))}
            </LivePanelList>
          </PanelSection>
        }
        right={
          <LiveHistoryPanel
            title={
              <>
                History <span className="normal-case tracking-normal text-muted">- XP changes</span>
              </>
            }
            empty={
              stats.history.length === 0 ? (
                <p className="m-0">No XP changes recorded yet.</p>
              ) : undefined
            }
          >
            {stats.history.map((e, i) => (
              <DataListRow
                key={`${e.wallTime}-${i}`}
                index={i}
                className="grid grid-cols-[auto_auto_auto_1fr] items-center gap-3 tabular-nums"
              >
                <span className="shrink-0 tabular-nums text-muted">{fmtClock(e.wallTime)}</span>
                <span className="text-accent">+{fmtCompact(e.delta)}</span>
                <span>{fmtCompact(e.rate)}/hr</span>
                <span className="text-right text-muted">{stageName(e.stageKey, e.stageWave)}</span>
              </DataListRow>
            ))}
          </LiveHistoryPanel>
        }
      />

      {showStatus && (
        <footer
          className={cn("border-t border-border pt-1 text-xs text-muted", idle && "text-gold")}
        >
          {stats.status}
        </footer>
      )}
    </TabPage>
  );
}
