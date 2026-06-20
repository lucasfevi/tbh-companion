import type { BoxTimerCatalogEntry } from "../../../shared/types";
import { Button } from "../design-system/primitives/Button/Button";
import { Select } from "../design-system/primitives/Select/Select";
import { cn } from "../lib/cn";

export function TrackerFarmStageSelect({ entry }: { entry: BoxTimerCatalogEntry }) {
  return (
    <div className="rounded-md border border-ideal/25 bg-ideal/10 px-2.5 py-2">
      <Select
        label="Farm at"
        variant="ideal"
        value={entry.idealStageKey}
        options={entry.farmStageOptions.map((option) => ({
          value: option.stageKey,
          label: option.label,
        }))}
        onValueChange={(stageKey) => {
          const key = Number(stageKey);
          if (!Number.isFinite(key) || key <= 0) return;
          if (key === entry.defaultIdealStageKey) {
            void window.tbh.clearBoxTrackerFarmStage(entry.boxId);
            return;
          }
          void window.tbh.setBoxTrackerFarmStage(entry.boxId, key);
        }}
        footer={
          <Button
            variant="link"
            className={cn(!entry.idealStageIsCustom && "pointer-events-none invisible")}
            onClick={() => void window.tbh.clearBoxTrackerFarmStage(entry.boxId)}
          >
            Reset farm to {entry.defaultIdealStageLabel}
          </Button>
        }
      />
    </div>
  );
}
