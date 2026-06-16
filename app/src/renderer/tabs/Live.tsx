import { useStats } from "../lib/useStats";
import { fmtCompact, fmtDuration, fmtXpUpdated, fmtClock } from "../lib/format";
import { stageName } from "../../core/stages";
import { Button } from "../components/ui/Button";
import { DataListRow } from "../components/ui/DataList";
import { PanelSection } from "../components/ui/PanelSection";
import { StatCard } from "../components/ui/StatCard";
import { TabMetricHero } from "../components/ui/TabMetricHero";
import { TabHeader } from "../components/ui/TabHeader";
import { TabPage } from "../components/ui/TabPage";
import { ChestDropPanel } from "../components/live/ChestDropPanel";
import { LiveHistoryPanel } from "../components/live/LiveHistoryPanel";
import { LiveMatchedPair } from "../components/live/LiveMatchedPair";
import { LivePanelList } from "../components/live/LivePanelList";
import { LiveChestStatValue } from "../lib/liveChestStat";
import { cn } from "../lib/cn";

const IDLE_THRESHOLD = 120;

const RATE_TIP =
  "XP/hour updates only when the game writes new XP to the save (often up to " +
  "3 minutes apart, sometimes longer). It holds steady between writes instead of decaying.";
const GOLD_TIP =
  "Gold earned per hour. Counts gold gained only; spending (upgrades, Cube, " +
  "runes) is ignored, so it's accurate while farming.";
const CHEST_RATE_TIP =
  "Drop rates from Player.log lines this session. Only counts while the companion is running.";

export function Live() {
  const stats = useStats();

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
