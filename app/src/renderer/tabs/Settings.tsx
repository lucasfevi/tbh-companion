import { useEffect, useState } from "react";
import { STEAM_CURRENCIES } from "../../core/steamPrice";
import type { AppConfig } from "../../../shared/types";
import { reportIpcError } from "../lib/reportError";

export function Settings() {
  const [cfg, setCfg] = useState<AppConfig | null>(null);
  const [draft, setDraft] = useState<AppConfig | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="settings">
      <h1>Settings</h1>
      <p className="muted">Stored in your app user-data folder as <code>config.json</code>.</p>

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
