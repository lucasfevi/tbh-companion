import { useEffect, useState } from "react";
import { STEAM_CURRENCIES } from "../../core/steamPrice";
import type { AppConfig, AppDataClearTarget, AppDataPaths } from "../../../shared/types";
import { reportIpcError } from "../lib/reportError";

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
    label: "Reset stage chest tracker",
    detail: "box_timers.json",
    confirm:
      "Reset stage chest tracker timers and enabled routes to defaults? Active cooldowns will be cleared.",
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

export function Settings() {
  const [cfg, setCfg] = useState<AppConfig | null>(null);
  const [draft, setDraft] = useState<AppConfig | null>(null);
  const [dataPaths, setDataPaths] = useState<AppDataPaths | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [clearBusy, setClearBusy] = useState<AppDataClearTarget | null>(null);
  const [clearLogsBusy, setClearLogsBusy] = useState(false);

  async function refreshDataPaths(): Promise<void> {
    if (typeof window.tbh?.getDataPaths !== "function") return;
    try {
      setDataPaths(await window.tbh.getDataPaths());
    } catch (err) {
      reportIpcError(err);
    }
  }

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
        setDraft(c);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        reportIpcError(err);
        const text = err instanceof Error ? err.message : "Could not load settings.";
        setLoadError(text);
      });
    void refreshDataPaths();
  }, []);

  if (loadError) {
    return (
      <div className="placeholder">
        <h1>Settings</h1>
        <p className="muted">{loadError}</p>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="placeholder">
        <h1>Settings</h1>
        <p className="muted">Loading...</p>
      </div>
    );
  }

  async function onSave() {
    if (!draft || !cfg) return;

    const resetsSession =
      draft.rollingWindowMinutes !== cfg.rollingWindowMinutes ||
      draft.trackCubeExp !== cfg.trackCubeExp;
    if (
      resetsSession &&
      !window.confirm(
        "Changing the rolling window or Cube XP setting resets your current session stats and history. Continue?",
      )
    ) {
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const saved = await window.tbh.saveConfig(draft);
      setCfg(saved);
      setDraft(saved);
      setMessage(
        resetsSession
          ? "Saved. Session stats were reset for the new tracking settings."
          : "Saved. Save-path or poll changes take effect immediately.",
      );
    } catch (err) {
      reportIpcError(err);
      setMessage("Failed to save settings.");
    } finally {
      setBusy(false);
    }
  }

  function onReset() {
    if (cfg) setDraft({ ...cfg });
    setMessage(null);
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
    <div className="settings">
      <h1>Settings</h1>
      <p className="muted">
        Configure save polling, session tracking, and defaults. Changes are stored as{" "}
        <code>config.json</code> in your app user-data folder.
      </p>
      <p className="muted small">
        Closing the main window keeps TBH Companion running in the system tray. Use{" "}
        <strong>Quit</strong> from the tray menu to exit fully.
      </p>

      <section className="settings-section">
        <h2>Game save</h2>
        <div className="settings-grid">
          <label className="field">
            <span>Save file path</span>
            <input
              value={draft.savePath}
              onChange={(e) => setDraft({ ...draft, savePath: e.target.value })}
            />
          </label>

          <label className="field">
            <span>ES3 password</span>
            <input
              value={draft.es3Password}
              onChange={(e) => setDraft({ ...draft, es3Password: e.target.value })}
            />
          </label>
        </div>
      </section>

      <section className="settings-section">
        <h2>Tracking</h2>
        <div className="settings-grid">
          <label className="field">
            <span>Poll interval (seconds)</span>
            <input
              type="number"
              min={1}
              value={draft.pollIntervalSeconds}
              onChange={(e) =>
                setDraft({ ...draft, pollIntervalSeconds: Math.max(1, Number(e.target.value) || 1) })
              }
            />
          </label>

          <label className="field">
            <span>Rolling window (minutes)</span>
            <input
              type="number"
              min={1}
              value={draft.rollingWindowMinutes}
              onChange={(e) =>
                setDraft({ ...draft, rollingWindowMinutes: Math.max(1, Number(e.target.value) || 1) })
              }
            />
            <span className="muted small">Changing this resets the current session.</span>
          </label>

          <label className="field">
            <span>Market currency</span>
            <select
              value={draft.currency}
              onChange={(e) => setDraft({ ...draft, currency: e.target.value })}
            >
              {STEAM_CURRENCIES.map((c) => (
                <option key={c.iso} value={c.iso}>
                  {c.iso} - {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field checkbox">
            <input
              type="checkbox"
              checked={draft.trackCubeExp}
              onChange={(e) => setDraft({ ...draft, trackCubeExp: e.target.checked })}
            />
            <span>Include Hero-dric Cube XP in totals (resets session when toggled)</span>
          </label>

          <label className="field checkbox">
            <input
              type="checkbox"
              checked={draft.startTopmost}
              onChange={(e) => setDraft({ ...draft, startTopmost: e.target.checked })}
            />
            <span>Keep main window on top</span>
          </label>

          <label className="field checkbox">
            <input
              type="checkbox"
              checked={draft.logHistoryCsv}
              onChange={(e) => setDraft({ ...draft, logHistoryCsv: e.target.checked })}
            />
            <span>Log XP history to CSV</span>
          </label>
        </div>
      </section>

      <section className="settings-section">
        <h2>Diagnostics</h2>
        <p className="muted small">
          When reporting an issue, you can send the diagnostic log file from Settings.
        </p>
        {dataPaths ? (
          <p className="muted small cache-path">
            <span>Log file:</span> <code>{dataPaths.diagnosticLogPath}</code>
          </p>
        ) : (
          <p className="muted small">Loading log path…</p>
        )}
        <div className="cache-action-row">
          <div className="cache-action-copy">
            <strong>Clear diagnostic logs</strong>
            <span className="muted small">logs/app.log and rotated archives</span>
          </div>
          <button
            type="button"
            className="btn"
            disabled={clearLogsBusy || Boolean(clearBusy) || !dataPaths?.entries.find((e) => e.id === "diagnostic-log")?.exists}
            onClick={() => void onClearDiagnosticLogs()}
          >
            {clearLogsBusy ? "Clearing…" : "Clear"}
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h2>Data &amp; cache</h2>
        <p className="muted small">
          Cached catalog, prices, and tracker data live in your app user-data folder.{" "}
          <code>config.json</code> is never removed by these actions.
        </p>
        {dataPaths ? (
          <p className="muted small cache-path">
            <span>Folder:</span> <code>{dataPaths.userDataDir}</code>
          </p>
        ) : (
          <p className="muted small">Loading cache paths…</p>
        )}

        <ul className="cache-actions">
          {CLEAR_ACTIONS.map((action) => {
            const hasData = pathEntryExists(action.target);
            const isBusy = clearBusy === action.target;
            const isDanger = action.target === "all-except-config";
            return (
              <li key={action.target} className="cache-action-row">
                <div className="cache-action-copy">
                  <strong>{action.label}</strong>
                  <span className="muted small">{action.detail}</span>
                  {!showMissingHint(action.target) ? null : (
                    <span className="muted small">Nothing cached yet.</span>
                  )}
                </div>
                <button
                  type="button"
                  className={isDanger ? "btn danger" : "btn"}
                  disabled={Boolean(clearBusy) || !hasData}
                  onClick={() => void onClearCache(action.target, action.confirm)}
                >
                  {isBusy ? "Clearing…" : "Clear"}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="settings-section">
        <h2>About</h2>
        <p className="muted small">
          TBH Companion — unofficial fan tool for Task Bar Hero players. Not affiliated with
          Tesseract Studio. Does not modify your save or connect to game servers.
        </p>
      </section>

      <div className="settings-actions">
        <button className="btn primary" disabled={busy} onClick={() => void onSave()}>
          Save settings
        </button>
        <button className="btn" disabled={busy} onClick={onReset}>
          Reset
        </button>
      </div>

      {message && <p className="settings-message">{message}</p>}
    </div>
  );
}
