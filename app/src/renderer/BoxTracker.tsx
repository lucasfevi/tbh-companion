import { useBoxTimers, fmtTimer } from "./lib/useBoxTimers";
import { stageName } from "../core/stages";
import type { BoxTimerRow } from "../../shared/types";
import {
  boxTrackerRowsBySection,
  boxTrackerSectionOrder,
  formatCooldownMinutes,
} from "./lib/boxTrackerUi";
import { Button } from "./components/ui/Button";
import { Badge } from "./components/ui/Badge";
import { CapacityBar } from "./components/ui/CapacityBar";
import { Card } from "./components/ui/Card";
import { IconButton } from "./components/ui/IconButton";
import { LinkButton } from "./components/ui/LinkButton";
import { OverlayFrame } from "./components/ui/OverlayFrame";
import { cn } from "./lib/cn";

function BoxTimerCard({ row }: { row: BoxTimerRow }) {
  return (
    <Card
      as="li"
      padding="compact"
      className={cn(
        "border-l-[3px]",
        row.status === "cooldown" && "border-l-status-info",
        row.status === "ready" && "border-l-status-success",
        row.atIdealStage && "shadow-[inset_0_0_0_1px] shadow-ideal/25",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="font-semibold">Lv{row.level ?? "?"}</span>
            <span
              className={cn(
                "truncate text-right text-[10px] leading-snug",
                row.atIdealStage ? "font-medium text-ideal" : "text-muted",
              )}
            >
              {row.idealStageLabel}
            </span>
          </div>
        </div>
        <Badge
          variant={row.status === "ready" ? "statusReady" : "statusCooldown"}
          className="shrink-0"
        >
          {row.status === "cooldown" ? fmtTimer(row.remainingSeconds) : "Ready"}
        </Badge>
      </div>
      <p className="m-0 mt-1 text-[10px] text-muted">
        Cooldown: {formatCooldownMinutes(row.cooldownSeconds)}
        {row.cooldownIsCustom ? " (custom)" : ""}
      </p>
      {row.status === "cooldown" ? (
        <>
          <CapacityBar percent={row.progress * 100} variant="blue" compact className="mt-1" />
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="flex-1 text-xs text-muted">On cooldown</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void window.tbh.clearBoxTimer(row.boxId)}
            >
              Reset
            </Button>
          </div>
        </>
      ) : (
        <Button
          variant="success"
          className="mt-1 w-full"
          onClick={() => void window.tbh.markBoxDropped(row.boxId)}
        >
          Dropped
        </Button>
      )}
    </Card>
  );
}

export function BoxTracker() {
  const state = useBoxTimers();

  if (!state) {
    return (
      <OverlayFrame>
        <p className="m-0 text-muted">Loading…</p>
      </OverlayFrame>
    );
  }

  const currentLabel = stageName(state.currentStageKey);
  const sections = boxTrackerSectionOrder(state.sortOrder);

  const sectionContent = {
    cooldown: {
      title: "On cooldown",
      rows: boxTrackerRowsBySection(state.rows, "cooldown"),
    },
    ready: {
      title: "Ready to mark",
      rows: boxTrackerRowsBySection(state.rows, "ready"),
    },
  } as const;

  return (
    <OverlayFrame>
      <div className="flex shrink-0 items-center justify-between">
        <span className="drag-handle whitespace-nowrap text-[10px] font-bold tracking-wide text-muted">
          Stage boss chest tracker
        </span>
        <div className="no-drag flex gap-1">
          <IconButton type="button" title="Open full window" onClick={() => window.tbh.showMain()}>
            {"\u2922"}
          </IconButton>
          <IconButton
            type="button"
            edge="end"
            title="Close"
            onClick={() => window.tbh.closeBoxTracker()}
          >
            {"\u2715"}
          </IconButton>
        </div>
      </div>

      <div className="no-drag flex flex-wrap gap-1.5">
        <Badge variant="info">{state.cooldownCount} cooling</Badge>
        <Badge variant="success">{state.readyCount} ready</Badge>
        <Badge variant="muted">Stage: {currentLabel}</Badge>
      </div>

      <p className="no-drag m-0 break-words text-[10px] text-muted">
        Tap Dropped when a boss chest drops, or rely on Player.log auto-detect.
      </p>

      {state.rows.length === 0 ? (
        <p className="no-drag m-0 text-center text-xs text-muted">
          No levels tracked. Open the Chests tab to pick boxes and set cooldowns.
        </p>
      ) : (
        <div className="no-drag flex min-h-0 flex-1 flex-col gap-2.5 overflow-auto">
          {sections.map((section) => {
            const { title, rows } = sectionContent[section];
            if (rows.length === 0) return null;
            return (
              <section key={section} className="flex flex-col gap-1.5">
                <h3 className="m-0 text-[11px] font-bold uppercase tracking-wide text-muted">
                  {title}
                </h3>
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {rows.map((row) => (
                    <BoxTimerCard key={row.boxId} row={row} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <LinkButton className="no-drag self-start text-[10px]" onClick={() => window.tbh.showMain()}>
        Configure on Chests tab
      </LinkButton>
    </OverlayFrame>
  );
}
