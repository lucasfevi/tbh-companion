import type { BoxTimerCatalogEntry } from "../../../shared/types";
import { formatCooldownMinutes, parseCooldownMinutesInput } from "../lib/boxTrackerUi";
import { TrackerFarmStageSelect } from "./TrackerFarmStageSelect";
import { Field } from "./ui/Field";
import { LinkButton } from "./ui/LinkButton";
import { NumberField } from "./ui/NumberInput";
import { cn } from "../lib/cn";

export function TrackerConfigRow({
  entry,
  defaultCooldownSeconds,
  notificationsEnabled = true,
}: {
  entry: BoxTimerCatalogEntry;
  defaultCooldownSeconds: number;
  notificationsEnabled?: boolean;
}) {
  const minutes = Math.round(entry.cooldownSeconds / 60);

  return (
    <article
      className={cn(
        "flex flex-col gap-2.5 rounded-lg border border-border bg-card p-3",
        "shadow-[inset_0_1px_0_0_color-mix(in_oklab,var(--color-fg)_6%,transparent)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
            Stage boss chest
          </p>
          <p className="m-0 mt-0.5 text-2xl font-semibold tabular-nums leading-none tracking-tight">
            Lv{entry.level ?? "?"}
          </p>
        </div>
        <NumberField
          label="Cooldown (min)"
          labelAlign="end"
          footerAlign="end"
          density="compact"
          align="center"
          inputClassName="w-[3.25rem]"
          min={1}
          max={1440}
          step={1}
          defaultValue={minutes}
          key={`${entry.boxId}-${minutes}-${entry.cooldownIsCustom}`}
          onBlur={(event) => {
            const seconds = parseCooldownMinutesInput(event.target.value);
            if (seconds == null) {
              event.target.value = String(minutes);
              return;
            }
            if (seconds === defaultCooldownSeconds && entry.cooldownIsCustom) {
              void window.tbh.clearBoxTrackerCooldown(entry.boxId);
              return;
            }
            if (seconds !== entry.cooldownSeconds) {
              void window.tbh.setBoxTrackerCooldown(entry.boxId, seconds);
            }
          }}
          footer={
            <LinkButton
              className={cn(
                "text-[10px]",
                !entry.cooldownIsCustom && "pointer-events-none invisible",
              )}
              onClick={() => void window.tbh.clearBoxTrackerCooldown(entry.boxId)}
            >
              Reset to {formatCooldownMinutes(defaultCooldownSeconds)}
            </LinkButton>
          }
        />
      </div>

      <TrackerFarmStageSelect entry={entry} />

      <Field
        label="Notify when ready"
        checkbox
        hint={!notificationsEnabled ? "Enable notification sounds in Settings." : undefined}
      >
        <input
          type="checkbox"
          checked={entry.notifyWhenReady}
          disabled={!notificationsEnabled}
          onChange={(e) => void window.tbh.setBoxTrackerNotify(entry.boxId, e.target.checked)}
        />
      </Field>
    </article>
  );
}
