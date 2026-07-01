import { useState } from "react";
import type { LiveMemoryPrefs } from "../../../shared/types";
import { Button } from "../design-system/primitives/Button/Button";
import { Checkbox } from "../design-system/primitives/Checkbox/Checkbox";
import { Section } from "../design-system/primitives/Section/Section";
import { Dialog } from "../design-system/primitives/Dialog/Dialog";
import { DialogTitle } from "../design-system/primitives/Dialog/DialogParts";

const SESSION_RESET_NOTE =
  "Switching modes resets your session stats (XP, gold, chest drops) so rates stay accurate — " +
  "live memory and the save file measure progress on different baselines.";

/**
 * Opt-in live-memory reader toggle. The first time it's enabled, a one-time
 * consent dialog explains the read-only trust model; reading only starts after
 * explicit accept. Afterwards it's a plain off-by-default toggle.
 */
export function LiveMemorySettings({
  prefs,
  disabled,
  onChange,
}: {
  prefs: LiveMemoryPrefs;
  disabled?: boolean;
  onChange: (next: LiveMemoryPrefs) => void;
}) {
  const [consentOpen, setConsentOpen] = useState(false);
  const [toggleConfirmOpen, setToggleConfirmOpen] = useState(false);
  const [pendingEnabled, setPendingEnabled] = useState<boolean | null>(null);

  function applyEnabled(checked: boolean): void {
    onChange({ ...prefs, enabled: checked });
  }

  function handleToggle(checked: boolean): void {
    // First enable requires the one-time consent dialog before reading starts.
    if (checked && !prefs.consentAccepted) {
      setConsentOpen(true);
      return;
    }
    setPendingEnabled(checked);
    setToggleConfirmOpen(true);
  }

  function acceptConsent(): void {
    setConsentOpen(false);
    onChange({ enabled: true, consentAccepted: true });
  }

  function confirmToggle(): void {
    if (pendingEnabled !== null) {
      applyEnabled(pendingEnabled);
    }
    setToggleConfirmOpen(false);
    setPendingEnabled(null);
  }

  return (
    <Section title="Live memory (experimental)">
      <p className="m-0 text-xs text-muted">
        Reads the game&apos;s memory (read-only) so XP, gold, and chest stats update live instead of
        waiting for save writes. It never modifies the game or your save, and may stop working after
        a game update.
      </p>
      <Checkbox
        label="Enable live memory reader"
        checked={prefs.enabled}
        disabled={disabled}
        onCheckedChange={handleToggle}
      />

      <Dialog open={consentOpen} onOpenChange={setConsentOpen}>
        <DialogTitle className="m-0 text-base font-semibold">
          Enable live memory reading?
        </DialogTitle>
        <p className="mt-2 mb-0 text-[13px] text-muted">
          The companion will read the game&apos;s memory <strong>read-only</strong> to show live
          stats. It never modifies the game or your save file, and never contacts the game&apos;s
          servers. It may stop working after a game update. You can turn it off at any time.
        </p>
        <p className="mt-2 mb-0 text-[13px] text-muted">{SESSION_RESET_NOTE}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConsentOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={acceptConsent}>
            Accept &amp; enable
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={toggleConfirmOpen}
        onOpenChange={(open) => {
          setToggleConfirmOpen(open);
          if (!open) setPendingEnabled(null);
        }}
      >
        <DialogTitle className="m-0 text-base font-semibold">
          {pendingEnabled ? "Enable live memory?" : "Disable live memory?"}
        </DialogTitle>
        <p className="mt-2 mb-0 text-[13px] text-muted">{SESSION_RESET_NOTE}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setToggleConfirmOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={confirmToggle}>
            {pendingEnabled ? "Enable & reset session" : "Disable & reset session"}
          </Button>
        </div>
      </Dialog>
    </Section>
  );
}
