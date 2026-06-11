import { useStats } from "../lib/useStats";
import { fmtCompact, fmtDuration, fmtXpUpdated, fmtClock } from "../lib/format";
import { stageName } from "../../core/stages";
import { Button } from "../components/ui/Button";
import { PanelSection } from "../components/ui/PanelSection";
import { StatCard } from "../components/ui/StatCard";
import { TabHeader } from "../components/ui/TabHeader";
import { TabPage } from "../components/ui/TabPage";
import { cn } from "../lib/cn";

const IDLE_THRESHOLD = 120;

const RATE_TIP =
  "XP/hour updates only when the game writes new XP to the save (often up to " +
  "3 minutes apart, sometimes longer). It holds steady between writes instead of decaying.";
const GOLD_TIP =
  "Gold earned per hour. Counts gold gained only; spending (upgrades, Cube, " +
  "runes) is ignored, so it's accurate while farming.";

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

  return (
    <TabPage>
      <TabHeader
        title="Live stats"
        intro="Reads your save on a timer. XP and gold rates update when the game writes new progress—often up to three minutes apart, sometimes longer."
      />

      <section className="grid grid-cols-[auto_1fr_auto] items-center gap-x-[18px] gap-y-3.5 rounded-[10px] border border-border bg-card px-3.5 py-3 max-[560px]:grid-cols-[1fr_auto] max-[560px]:grid-rows-[auto_auto]">
        <div
          className="flex cursor-help items-baseline gap-2 max-[560px]:col-span-full"
          title={RATE_TIP}
        >
          <span className="text-[40px] font-bold leading-none text-accent">
            {fmtCompact(stats.rollingRate)}
          </span>
          <span className="text-[13px] tracking-wide text-muted">XP / hr</span>
        </div>

        <div className="flex min-w-0 flex-col gap-1">
          <div
            className="cursor-help text-[15px] font-semibold leading-tight text-gold"
            title={GOLD_TIP}
          >
            {fmtCompact(stats.goldRate)} gold / hr
          </div>
          <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs text-muted">
            <span>
              Map{" "}
              <b className="font-semibold text-fg">{stageName(stats.stageKey, stats.stageWave)}</b>
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
        </div>

        <Button
          size="sm"
          className="self-center"
          title="Reset session stats"
          onClick={() => window.tbh.reset()}
        >
          {"\u21bb"} Reset
        </Button>
      </section>

      <section className="grid grid-cols-4 gap-2.5">
        <StatCard label="Session XP" value={fmtCompact(stats.cumulativeGained)} />
        <StatCard label="Session gold" value={fmtCompact(stats.goldGained)} />
        <StatCard label="Elapsed" value={fmtDuration(stats.elapsed)} />
        <StatCard label="Session XP/hr" value={fmtCompact(stats.sessionRate)} />
      </section>

      <PanelSection title="Heroes">
        {stats.heroes.length === 0 ? (
          <p className="m-0 text-muted">No active heroes yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            {stats.heroes.map((h, i) => (
              <div
                key={h.key}
                className={cn(
                  "grid grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-2 text-[13px]",
                  i % 2 === 0 && "bg-panel",
                )}
              >
                <span className="font-semibold">{h.name}</span>
                <span className="text-muted">Lv {h.level}</span>
                <span className="tabular-nums text-accent">{fmtCompact(h.rate)}/hr</span>
              </div>
            ))}
          </div>
        )}
      </PanelSection>

      <PanelSection
        title={
          <>
            History <span className="normal-case tracking-normal text-muted">- XP changes</span>
          </>
        }
      >
        {stats.history.length === 0 ? (
          <p className="m-0 text-muted">No XP changes recorded yet.</p>
        ) : (
          <div className="max-h-[220px] overflow-y-auto rounded-lg border border-border">
            {stats.history.map((e, i) => (
              <div
                key={`${e.wallTime}-${i}`}
                className={cn(
                  "grid grid-cols-[auto_auto_auto_1fr] items-center gap-3 px-3 py-2 text-[13px] tabular-nums",
                  i % 2 === 0 && "bg-panel",
                )}
              >
                <span className="text-muted">{fmtClock(e.wallTime)}</span>
                <span className="text-accent">+{fmtCompact(e.delta)}</span>
                <span>{fmtCompact(e.rate)}/hr</span>
                <span className="text-right text-muted">{stageName(e.stageKey, e.stageWave)}</span>
              </div>
            ))}
          </div>
        )}
      </PanelSection>

      {showStatus && (
        <footer
          className={cn("border-t border-border pt-1 text-xs text-muted", idle && "text-[#e0a64a]")}
        >
          {stats.status}
        </footer>
      )}
    </TabPage>
  );
}
