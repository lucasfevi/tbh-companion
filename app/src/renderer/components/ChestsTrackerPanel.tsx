import { useEffect, useState } from "react";
import type { AppConfig } from "../../../shared/types";
import { useBoxTimers } from "../lib/useBoxTimers";
import { reportIpcError } from "../lib/reportError";
import {
  applyTrackerPreset,
  enabledCatalogEntries,
  normalizeBoxTrackerSortOrder,
  toggleTrackedLevel,
  TRACKER_LEVEL_CHIP_GRID_CLASS,
  TRACKER_LEVEL_CHIP_WIDTH_CLASS,
  TRACKER_PRESETS,
} from "../lib/boxTrackerUi";
import { TrackerConfigRow } from "./TrackerConfigRow";
import { Button } from "../design-system/primitives/Button/Button";
import { Field } from "../design-system/primitives/Field/Field";
import { PanelSection } from "../design-system/primitives/PanelSection/PanelSection";
import { Select } from "../design-system/primitives/Select/Select";
import { cn } from "../lib/cn";

export function ChestsTrackerPanel() {
  const state = useBoxTimers();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    if (typeof window.tbh?.getConfig !== "function") return;
    void window.tbh
      .getConfig()
      .then((config: AppConfig) => setNotificationsEnabled(config.notificationsEnabled))
      .catch((err: unknown) => reportIpcError(err));
  }, []);

  if (!state) {
    return (
      <section
        aria-labelledby="stage-chest-tracker-heading"
        className="flex flex-col gap-2 rounded-lg border border-border bg-panel/50 p-3.5"
      >
        <h2 id="stage-chest-tracker-heading" className="m-0 text-base font-semibold">
          Stage boss chest tracker
        </h2>
        <p className="m-0 text-xs text-muted">Loading tracker settings…</p>
      </section>
    );
  }

  const enabledEntries = enabledCatalogEntries(state.catalog);

  return (
    <section
      aria-labelledby="stage-chest-tracker-heading"
      className="flex flex-col gap-3 rounded-lg border border-border bg-panel/50 p-3.5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 id="stage-chest-tracker-heading" className="m-0 text-base font-semibold">
            Stage boss chest tracker
          </h2>
          <p className="m-0 mt-1 max-w-prose text-xs leading-relaxed text-muted">
            Track rare stage boss drops and cooldowns while farming. Timers start from the overlay
            or automatically when Player.log records a drop.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          className="shrink-0"
          onClick={() => window.tbh.openBoxTracker()}
        >
          Open overlay
        </Button>
      </div>

      {!notificationsEnabled ? (
        <p className="m-0 text-xs text-muted">
          Enable notification sounds in Settings (Chest ready) to hear when tracked cooldowns
          finish.
        </p>
      ) : null}

      <PanelSection title="Overlay display">
        <Field
          label="Show first in overlay"
          hint="Controls section order in the stage boss overlay."
        >
          <Select
            className="max-w-xs"
            value={state.sortOrder}
            onValueChange={(value) =>
              void window.tbh.setBoxTrackerSortOrder(normalizeBoxTrackerSortOrder(String(value)))
            }
            options={[
              { value: "cooldown-first", label: "On cooldown" },
              { value: "ready-first", label: "Ready to mark" },
            ]}
          />
        </Field>
      </PanelSection>

      <PanelSection title="Levels to track">
        <div className="flex flex-wrap gap-1">
          {TRACKER_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              size="sm"
              variant="ghost"
              title={preset.title}
              onClick={() => applyTrackerPreset(preset.levels, state.catalog)}
            >
              {preset.label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => void window.tbh.setBoxTrackerBoxes([])}>
            Clear
          </Button>
        </div>
        {/* Raw toggle chips — no ToggleChip primitive yet; pill shape + grid density are one-off. */}
        <div className={cn("mt-1.5 grid gap-1", TRACKER_LEVEL_CHIP_GRID_CLASS)}>
          {state.catalog.map((entry) => (
            <button
              key={entry.boxId}
              type="button"
              className={cn(
                "box-border cursor-pointer rounded-full border px-1 py-0.5 text-center text-[10px] font-semibold leading-tight break-words whitespace-normal",
                TRACKER_LEVEL_CHIP_WIDTH_CLASS,
                entry.enabled
                  ? "border-accent bg-ideal/15 text-accent"
                  : "border-border bg-card text-muted hover:border-muted hover:text-fg",
              )}
              title={`${entry.idealStageLabel} · ${entry.dropStageRangeLabel}${
                entry.enabled ? " — tracking" : " — tap to track"
              }`}
              onClick={() => toggleTrackedLevel(entry, state.catalog)}
            >
              Lv{entry.level}
            </button>
          ))}
        </div>
      </PanelSection>

      {enabledEntries.length === 0 ? (
        <p className="m-0 text-xs text-muted">
          Pick at least one level above to set cooldowns and view farm stages.
        </p>
      ) : (
        <PanelSection title="Per-level settings">
          <div className="grid grid-cols-1 gap-2 min-[640px]:grid-cols-2">
            {enabledEntries.map((entry) => (
              <TrackerConfigRow
                key={entry.boxId}
                entry={entry}
                defaultCooldownSeconds={state.defaultCooldownSeconds}
                notificationsEnabled={notificationsEnabled}
              />
            ))}
          </div>
        </PanelSection>
      )}
    </section>
  );
}
