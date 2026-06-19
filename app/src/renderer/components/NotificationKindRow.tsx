import { useState } from "react";
import type {
  NotificationKindId,
  NotificationKindPreference,
  NotificationPrefs,
  NotificationSoundId,
} from "../../../shared/notificationCatalog";
import {
  NOTIFICATION_KIND_ENTRIES,
  NOTIFICATION_SOUND_ENTRIES,
} from "../../../shared/notificationCatalog";
import { playNotificationSound } from "../lib/notificationSounds";
import { Button } from "../design-system/primitives/Button/Button";
import { Field } from "./ui/Field";
import { Select } from "./ui/Select";

const SOUND_OPTIONS: { value: NotificationSoundId; label: string }[] = [
  ...NOTIFICATION_SOUND_ENTRIES.map((s) => ({ value: s.id, label: s.label })),
  { value: "none", label: "None (silent)" },
];

export function NotificationKindRow({
  kindId,
  pref,
  disabled,
  saveBusy,
  notificationVolume = 100,
  onChange,
}: {
  kindId: NotificationKindId;
  pref: NotificationKindPreference;
  disabled: boolean;
  saveBusy: boolean;
  notificationVolume?: number;
  onChange: (next: NotificationKindPreference) => void;
}) {
  const kind = NOTIFICATION_KIND_ENTRIES.find((k) => k.id === kindId)!;
  const [previewBusy, setPreviewBusy] = useState(false);

  function onPreview() {
    setPreviewBusy(true);
    try {
      playNotificationSound(pref.sound, notificationVolume);
    } finally {
      setPreviewBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-card/40 p-3">
      <div>
        <p className="m-0 text-[13px] font-semibold text-fg">{kind.label}</p>
        <p className="m-0 mt-0.5 text-xs text-muted">{kind.description}</p>
      </div>
      <Field label="Enabled" checkbox>
        <input
          type="checkbox"
          checked={pref.enabled}
          disabled={disabled || saveBusy}
          onChange={(e) => onChange({ ...pref, enabled: e.target.checked })}
        />
      </Field>
      <Field label="Sound">
        <Select
          value={pref.sound}
          disabled={disabled || !pref.enabled || saveBusy}
          onChange={(e) => onChange({ ...pref, sound: e.target.value as NotificationSoundId })}
        >
          {SOUND_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </Field>
      <Button
        disabled={
          disabled ||
          !pref.enabled ||
          pref.sound === "none" ||
          notificationVolume <= 0 ||
          previewBusy ||
          saveBusy
        }
        onClick={() => void onPreview()}
      >
        {previewBusy ? "Playing…" : "Preview sound"}
      </Button>
    </div>
  );
}

export function NotificationSoundAccordion({
  prefs,
  disabled,
  saveBusy,
  notificationVolume = 100,
  onKindChange,
}: {
  prefs: NotificationPrefs;
  disabled: boolean;
  saveBusy: boolean;
  notificationVolume?: number;
  onKindChange: (kindId: NotificationKindId, next: NotificationKindPreference) => void;
}) {
  return (
    <>
      {NOTIFICATION_KIND_ENTRIES.map((kind) => (
        <NotificationKindRow
          key={kind.id}
          kindId={kind.id}
          pref={prefs[kind.id]}
          disabled={disabled}
          saveBusy={saveBusy}
          notificationVolume={notificationVolume}
          onChange={(next) => onKindChange(kind.id, next)}
        />
      ))}
    </>
  );
}
