import { useEffect, useState } from "react";
import { STEAM_CURRENCIES } from "../../core/steamPrice";
import type { AppConfig, AppDataClearTarget, AppDataPaths } from "../../../shared/types";
import { reportIpcError } from "../lib/reportError";
import { Accordion } from "../components/ui/Accordion";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Field } from "../components/ui/Field";
import { NumberInput } from "../components/ui/NumberInput";
import { Section } from "../components/ui/Section";
import { Select } from "../components/ui/Select";
import { TabHeader } from "../components/ui/TabHeader";
import { TabPage } from "../components/ui/TabPage";

const CLEAR_ACTIONS: {
  target: AppDataClearTarget;
  label: string;
  detail: string;
  confirm: string;
}[] = [
  {
    target: "catalog",
    label: "Clear item catalog cache",
    detail: "gamedata.json, gear_levels.json",
    confirm:
      "Remove the downloaded item catalog and gear-level cache? The app will use bundled catalog data until you refresh again.",
  },
  {
    target: "prices",
    label: "Clear Steam Market prices",
    detail: "prices.*.json",
    confirm:
      "Remove all cached Steam Market prices? Inventory values will need to be fetched again from the Market tab.",
  },
  {
    target: "box-timers",
    label: "Reset stage boss chest tracker",
    detail: "box_timers.json",
    confirm:
      "Reset stage boss chest tracker timers and enabled routes to defaults? Active cooldowns will be cleared.",
  },
  {
    target: "session",
    label: "Clear session snapshot",
    detail: "session_state.json",
    confirm:
      "Clear the saved session snapshot and reset live stats? Your current session totals and history will start fresh.",
  },
  {
    target: "all-except-config",
    label: "Clear all except settings",
    detail: "All caches above; config.json is kept",
    confirm:
      "Clear all cached data except config.json? Catalog, prices, box timers, and live session stats will reset.",
  },
];

type SettingsPatch = Omit<AppConfig, "es3Password">;

const CHEST_SOUND_OPTIONS: { value: AppConfig["chestSoundVariant"]; label: string }[] = [
  { value: "soft-chime", label: "Soft chime (default)" },
  { value: "double-tap", label: "Double tap" },
  { value: "wood-tick", label: "Wood tick" },
  { value: "whisper-ping", label: "Whisper ping" },
  { value: "none", label: "None (silent)" },
];

function CacheActionRow({
  title,
  detail,
  missingHint,
  variant = "default",
  disabled,
  busy,
  onClear,
}: {
  title: string;
  detail: string;
  missingHint?: string;
  variant?: "default" | "danger";
  disabled?: boolean;
  busy?: boolean;
  onClear: () => void;
}) {
  return (
    <Card padding="compact" className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <strong className="text-[13px] font-semibold">{title}</strong>
        <span className="text-xs text-muted">{detail}</span>
        {missingHint ? <span className="text-xs text-muted">{missingHint}</span> : null}
      </div>
      <Button variant={variant} className="shrink-0" disabled={disabled} onClick={onClear}>
        {busy ? "Clearing…" : "Clear"}
      </Button>
    </Card>
  );
}

export function Settings() {
  const [cfg, setCfg] = useState<AppConfig | null>(null);
  const [dataPaths, setDataPaths] = useState<AppDataPaths | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [browseBusy, setBrowseBusy] = useState(false);
  const [clearBusy, setClearBusy] = useState<AppDataClearTarget | null>(null);
  const [clearLogsBusy, setClearLogsBusy] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [discordUrl, setDiscordUrl] = useState("");
  const [discordUrlError, setDiscordUrlError] = useState<string | null>(null);
  const [discordTestBusy, setDiscordTestBusy] = useState(false);
  const [discordTestResult, setDiscordTestResult] = useState<{ ok: boolean; error?: string } | null>(null);

  async function refreshDataPaths(): Promise<void> {
    if (typeof window.tbh?.getDataPaths !== "function") return;
    try {
      setDataPaths(await window.tbh.getDataPaths());
    } catch (err) {
      reportIpcError(err);
    }
  }

  useEffect(() => {
    if (cfg) setDiscordUrl(cfg.discordWebhookUrl);
  }, [cfg?.discordWebhookUrl]);

  useEffect(() => {
    if (typeof window.tbh?.getConfig !== "function") {
      setLoadError(
        "Settings API is not loaded. Quit the app completely and start it again (after git pull, restart npm run dev too).",
      );
      return;
    }
    void window.tbh
      .getConfig()
      .then((c) => {
        setCfg(c);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        reportIpcError(err);
        const text = err instanceof Error ? err.message : "Could not load settings.";
        setLoadError(text);
      });
    void refreshDataPaths();
  }, []);

  async function savePartial(
    patch: Partial<SettingsPatch>,
    successMessage?: string,
  ): Promise<AppConfig | null> {
    if (!cfg) return null;
    const prev = cfg;
    setCfg({ ...prev, ...patch });
    setSaveBusy(true);
    setMessage(null);
    try {
      const saved = await window.tbh.saveConfig(patch);
      setCfg(saved);
      if (successMessage) setMessage(successMessage);
      return saved;
    } catch (err) {
      reportIpcError(err);
      setCfg(prev);
      setMessage("Failed to save settings.");
      return null;
    } finally {
      setSaveBusy(false);
    }
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-lg font-semibold">Settings</h1>
        <p className="m-0 text-muted">{loadError}</p>
      </div>
    );
  }

  if (!cfg) {
    return (
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-lg font-semibold">Settings</h1>
        <p className="m-0 text-muted">Loading...</p>
      </div>
    );
  }

  async function onDiscordTest() {
    if (!discordUrl.trim()) {
      setDiscordUrlError("Enter a webhook URL to test.");
      return;
    }
    setDiscordUrlError(null);
    setDiscordTestResult(null);
    setDiscordTestBusy(true);
    try {
      const result = await window.tbh.testDiscordWebhook(discordUrl.trim());
      setDiscordTestResult(result);
    } catch {
      setDiscordTestResult({ ok: false, error: "IPC error — try restarting the app." });
    } finally {
      setDiscordTestBusy(false);
    }
  }

  async function onDiscordStart() {
    if (!discordUrl.trim()) {
      setDiscordUrlError("Webhook URL is required to start.");
      return;
    }
    setDiscordUrlError(null);
    await savePartial({ discordWebhookUrl: discordUrl.trim(), discordWebhookEnabled: true });
  }

  async function onDiscordStop() {
    setDiscordUrlError(null);
    await savePartial({ discordWebhookEnabled: false });
  }

  async function onPreviewChestSound() {
    if (!cfg) return;
    if (typeof window.tbh?.previewChestSound !== "function") {
      setMessage("Preview API is not loaded. Restart the app and try again.");
      return;
    }
    setPreviewBusy(true);
    try {
      await window.tbh.previewChestSound(cfg.chestSoundVariant);
    } catch (err) {
      reportIpcError(err);
      setMessage("Could not play the preview sound.");
    } finally {
      setPreviewBusy(false);
    }
  }

  async function onBrowseSave() {
    if (typeof window.tbh?.pickSaveFile !== "function") {
      setMessage("Save picker is not loaded. Restart the app and try again.");
      return;
    }
    setBrowseBusy(true);
    setMessage(null);
    try {
      const path = await window.tbh.pickSaveFile();
      if (path) await savePartial({ savePath: path }, "Save path updated.");
    } catch (err) {
      reportIpcError(err);
      setMessage("Could not open the save file picker.");
    } finally {
      setBrowseBusy(false);
    }
  }

  async function onClearDiagnosticLogs() {
    if (typeof window.tbh?.clearDiagnosticLogs !== "function") {
      setMessage("Diagnostics API is not loaded. Restart the app and try again.");
      return;
    }
    if (
      !window.confirm(
        "Delete diagnostic log files? Use this if logs grow large. XP history CSV is not removed.",
      )
    ) {
      return;
    }

    setClearLogsBusy(true);
    setMessage(null);
    try {
      const result = await window.tbh.clearDiagnosticLogs();
      if (!result.ok) {
        setMessage(result.error ?? "Could not clear diagnostic logs.");
        return;
      }
      await refreshDataPaths();
      const count = result.cleared.length;
      setMessage(
        count > 0
          ? `Cleared ${count} log file${count === 1 ? "" : "s"}.`
          : "Nothing to clear — log files were already missing.",
      );
    } catch (err) {
      reportIpcError(err, "settings-clear-logs");
      setMessage("Could not clear diagnostic logs.");
    } finally {
      setClearLogsBusy(false);
    }
  }

  async function onClearCache(target: AppDataClearTarget, confirmText: string) {
    if (typeof window.tbh?.clearAppData !== "function") {
      setMessage("Clear-cache API is not loaded. Restart the app and try again.");
      return;
    }
    if (!window.confirm(confirmText)) return;

    setClearBusy(target);
    setMessage(null);
    try {
      const result = await window.tbh.clearAppData(target);
      if (!result.ok) {
        setMessage(result.error ?? "Could not clear cache.");
        return;
      }
      await refreshDataPaths();
      const count = result.cleared.length;
      setMessage(
        count > 0
          ? `Cleared ${count} file${count === 1 ? "" : "s"}.`
          : "Nothing to clear — those files were already missing.",
      );
    } catch (err) {
      reportIpcError(err);
      setMessage("Could not clear cache.");
    } finally {
      setClearBusy(null);
    }
  }

  function pathEntryExists(target: AppDataClearTarget): boolean {
    if (!dataPaths) return false;
    if (target === "session" || target === "all-except-config") return true;
    return dataPaths.entries.find((e) => e.id === target)?.exists ?? false;
  }

  function showMissingHint(target: AppDataClearTarget): boolean {
    if (!dataPaths || target === "session" || target === "all-except-config") return false;
    return !pathEntryExists(target);
  }

  return (
    <TabPage>
      <TabHeader
        title="Settings"
        intro="Choose where the app reads your save and how live stats and prices behave. Changes save automatically."
      />

      <div className="flex max-w-md flex-col gap-3.5">
        <Section title="Save file">
          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted">Current save file</span>
            <code className="break-all rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-muted">
              {cfg.savePath}
            </code>
            <Button disabled={browseBusy || saveBusy} onClick={() => void onBrowseSave()}>
              {browseBusy ? "Opening…" : "Browse…"}
            </Button>
          </div>
        </Section>

        <Section title="Live stats">
          <div className="flex flex-col gap-3">
            <Field label="Poll interval (seconds)">
              <NumberInput
                min={1}
                defaultValue={cfg.pollIntervalSeconds}
                key={`poll-${cfg.pollIntervalSeconds}`}
                disabled={saveBusy}
                onBlur={(e) => {
                  const value = Math.max(1, Number(e.target.value) || 1);
                  if (value === cfg.pollIntervalSeconds) return;
                  void savePartial({ pollIntervalSeconds: value });
                }}
              />
            </Field>

            <Field
              label="Rolling window (minutes)"
              hint="Changing this resets the current session."
            >
              <NumberInput
                min={1}
                defaultValue={cfg.rollingWindowMinutes}
                key={`rolling-${cfg.rollingWindowMinutes}`}
                disabled={saveBusy}
                onBlur={(e) => {
                  const value = Math.max(1, Number(e.target.value) || 1);
                  if (value === cfg.rollingWindowMinutes) return;
                  if (
                    !window.confirm(
                      "Changing the rolling window resets your current session stats and history. Continue?",
                    )
                  ) {
                    e.target.value = String(cfg.rollingWindowMinutes);
                    return;
                  }
                  void savePartial(
                    { rollingWindowMinutes: value },
                    "Session stats were reset for the new rolling window.",
                  );
                }}
              />
            </Field>

            <Field label="Log XP history to CSV" checkbox>
              <input
                type="checkbox"
                checked={cfg.logHistoryCsv}
                disabled={saveBusy}
                onChange={(e) => void savePartial({ logHistoryCsv: e.target.checked })}
              />
            </Field>
          </div>
        </Section>

        <Section title="Steam Market">
          <Field label="Market currency">
            <Select
              value={cfg.currency}
              disabled={saveBusy}
              onChange={(e) => void savePartial({ currency: e.target.value })}
            >
              {STEAM_CURRENCIES.map((c) => (
                <option key={c.iso} value={c.iso}>
                  {c.iso} - {c.label}
                </option>
              ))}
            </Select>
          </Field>
        </Section>

        <Section title="Notifications">
          <p className="m-0 text-xs text-muted">
            Chest cooldown alerts play a sound in the app. App updates can show a Windows
            notification when enabled below.
          </p>
          <div className="flex flex-col gap-3">
            <Field label="Enable notifications" checkbox>
              <input
                type="checkbox"
                checked={cfg.notificationsEnabled}
                disabled={saveBusy}
                onChange={(e) => void savePartial({ notificationsEnabled: e.target.checked })}
              />
            </Field>

            <Field
              label="Notify when an app update is available"
              checkbox
              hint={!cfg.notificationsEnabled ? "Enable notifications above first." : undefined}
            >
              <input
                type="checkbox"
                checked={cfg.notifyOnUpdateAvailable}
                disabled={!cfg.notificationsEnabled || saveBusy}
                onChange={(e) => void savePartial({ notifyOnUpdateAvailable: e.target.checked })}
              />
            </Field>

            <Field
              label="Chest ready sound"
              hint={
                !cfg.notificationsEnabled
                  ? "Enable notifications above first."
                  : "Played when a tracked chest cooldown finishes (sound only)."
              }
            >
              <Select
                value={cfg.chestSoundVariant}
                disabled={!cfg.notificationsEnabled || saveBusy}
                onChange={(e) =>
                  void savePartial({
                    chestSoundVariant: e.target.value as AppConfig["chestSoundVariant"],
                  })
                }
              >
                {CHEST_SOUND_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Button
              disabled={
                !cfg.notificationsEnabled ||
                cfg.chestSoundVariant === "none" ||
                previewBusy ||
                saveBusy
              }
              onClick={() => void onPreviewChestSound()}
            >
              {previewBusy ? "Playing…" : "Preview sound"}
            </Button>
          </div>
        </Section>

        <Section title="Discord Webhook">
          <p className="m-0 text-xs text-muted">
            Send notifications to a Discord channel. Chest drops and hero level-ups are sent
            immediately. Stats reports are sent on a configurable interval.
          </p>
          <div className="flex flex-col gap-3">
            <Field label="Webhook URL">
              <div className="flex gap-2">
                <input
                  type="url"
                  className="min-w-0 flex-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-[13px] text-fg placeholder:text-muted focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-ideal/50 disabled:cursor-not-allowed disabled:opacity-50"
                  value={discordUrl}
                  disabled={cfg.discordWebhookEnabled || saveBusy}
                  placeholder="https://discord.com/api/webhooks/…"
                  onChange={(e) => {
                    setDiscordUrl(e.target.value);
                    if (discordUrlError) setDiscordUrlError(null);
                    if (discordTestResult) setDiscordTestResult(null);
                  }}
                />
                <Button
                  disabled={cfg.discordWebhookEnabled || discordTestBusy || saveBusy}
                  onClick={() => void onDiscordTest()}
                >
                  {discordTestBusy ? "Testing…" : "Test"}
                </Button>
                {cfg.discordWebhookEnabled ? (
                  <Button variant="danger" disabled={saveBusy} onClick={() => void onDiscordStop()}>
                    Stop
                  </Button>
                ) : (
                  <Button disabled={saveBusy} onClick={() => void onDiscordStart()}>
                    Start
                  </Button>
                )}
              </div>
              {discordUrlError && (
                <p className="m-0 mt-1 text-xs text-red-500">{discordUrlError}</p>
              )}
              {discordTestResult && (
                <p className={`m-0 mt-1 text-xs ${discordTestResult.ok ? "text-green-500" : "text-red-500"}`}>
                  {discordTestResult.ok
                    ? "✓ Test message sent successfully."
                    : `✗ Test failed: ${discordTestResult.error ?? "unknown error"}`}
                </p>
              )}
              {cfg.discordWebhookEnabled && (
                <p className="m-0 mt-1 text-xs text-green-500">● Webhook is running</p>
              )}
            </Field>

            <Field label="Notify on chest drop" checkbox>
              <input
                type="checkbox"
                checked={cfg.discordNotifyChestDrop}
                disabled={saveBusy}
                onChange={(e) => void savePartial({ discordNotifyChestDrop: e.target.checked })}
              />
            </Field>

            <Field label="Notify on hero level up" checkbox>
              <input
                type="checkbox"
                checked={cfg.discordNotifyHeroLevelUp}
                disabled={saveBusy}
                onChange={(e) => void savePartial({ discordNotifyHeroLevelUp: e.target.checked })}
              />
            </Field>

            <Field label="Send periodic stats reports" checkbox>
              <input
                type="checkbox"
                checked={cfg.discordNotifyStatsReport}
                disabled={saveBusy}
                onChange={(e) => void savePartial({ discordNotifyStatsReport: e.target.checked })}
              />
            </Field>

            <Field
              label="Stats report interval (minutes)"
              hint={!cfg.discordNotifyStatsReport ? "Enable stats reports above first." : undefined}
            >
              <NumberInput
                min={1}
                defaultValue={cfg.discordStatsReportIntervalMinutes}
                key={`discord-interval-${cfg.discordStatsReportIntervalMinutes}`}
                disabled={!cfg.discordNotifyStatsReport || saveBusy}
                onBlur={(e) => {
                  const value = Math.max(1, Number(e.target.value) || 30);
                  if (value === cfg.discordStatsReportIntervalMinutes) return;
                  void savePartial({ discordStatsReportIntervalMinutes: value });
                }}
              />
            </Field>
          </div>
        </Section>

        <Section title="Window & tray">
          <div className="flex flex-col gap-3">
            <Field label="Keep all windows on top" checkbox>
              <input
                type="checkbox"
                checked={cfg.startTopmost}
                disabled={saveBusy}
                onChange={(e) => void savePartial({ startTopmost: e.target.checked })}
              />
            </Field>
            <p className="m-0 text-xs text-muted">
              Closing the main window keeps TBH Companion running in the system tray. Use{" "}
              <strong>Quit</strong> from the tray menu to exit fully.
            </p>
          </div>
        </Section>

        <Accordion variant="panel" title="Advanced — logs and cached data">
          <Section title="Diagnostics">
            <p className="m-0 text-xs text-muted">
              When reporting an issue, you can send the diagnostic log file from Settings.
            </p>
            {dataPaths ? (
              <p className="m-0 text-xs text-muted">
                <span>Log file:</span>{" "}
                <code className="break-all">{dataPaths.diagnosticLogPath}</code>
              </p>
            ) : (
              <p className="m-0 text-xs text-muted">Loading log path…</p>
            )}
            <CacheActionRow
              title="Clear diagnostic logs"
              detail="app.log, main.log (legacy), and rotated archives"
              disabled={
                clearLogsBusy ||
                Boolean(clearBusy) ||
                !dataPaths?.entries.find((e) => e.id === "diagnostic-log")?.exists
              }
              busy={clearLogsBusy}
              onClear={() => void onClearDiagnosticLogs()}
            />
          </Section>

          <Section title="Data & cache">
            <p className="m-0 text-xs text-muted">
              Cached catalog, prices, and tracker data live in your app user-data folder.{" "}
              <code>config.json</code> is never removed by these actions.
            </p>
            {dataPaths ? (
              <p className="m-0 text-xs text-muted">
                <span>Folder:</span> <code className="break-all">{dataPaths.userDataDir}</code>
              </p>
            ) : (
              <p className="m-0 text-xs text-muted">Loading cache paths…</p>
            )}

            <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
              {CLEAR_ACTIONS.map((action) => {
                const hasData = pathEntryExists(action.target);
                const isBusy = clearBusy === action.target;
                const isDanger = action.target === "all-except-config";
                return (
                  <li key={action.target} className="list-none">
                    <CacheActionRow
                      title={action.label}
                      detail={action.detail}
                      missingHint={
                        showMissingHint(action.target) ? "Nothing cached yet." : undefined
                      }
                      variant={isDanger ? "danger" : "default"}
                      disabled={Boolean(clearBusy) || !hasData}
                      busy={isBusy}
                      onClear={() => void onClearCache(action.target, action.confirm)}
                    />
                  </li>
                );
              })}
            </ul>
          </Section>
        </Accordion>

        {message && <p className="m-0 text-[13px] text-accent">{message}</p>}
      </div>
    </TabPage>
  );
}
