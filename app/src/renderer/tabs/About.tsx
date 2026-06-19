import { useState } from "react";
import { SiDiscord, SiGithub } from "react-icons/si";
import type { UpdateStatus } from "../../../shared/types";
import { useUpdate } from "../lib/useUpdate";
import { reportIpcError } from "../lib/reportError";
import { Button, ButtonLink } from "../design-system/primitives/Button/Button";
import { ExternalLink } from "../components/ui/ExternalLink";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Section } from "../components/ui/Section";
import { TabHeader } from "../components/ui/TabHeader";
import { TabPage } from "../components/ui/TabPage";
import { DISCORD_URL, GITHUB_REPO, githubReleaseUrl } from "../lib/externalLinks";

function fmtBytes(bytes: number | undefined): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusMessage(status: UpdateStatus): string | null {
  switch (status.phase) {
    case "disabled":
      return "Updates aren't available in this build.";
    case "checking":
      return "Checking for a newer release…";
    case "not-available":
      return "You're on the latest release.";
    case "available":
      return status.availableVersion
        ? `Version ${status.availableVersion} is available.`
        : "A newer version is available.";
    case "downloading":
      return "Downloading update…";
    case "ready":
      return status.availableVersion
        ? `Version ${status.availableVersion} is ready to install.`
        : "Update downloaded and ready to install.";
    case "error":
      return status.error ?? "Update check failed.";
    default:
      return null;
  }
}

export function About() {
  const status = useUpdate();
  const [busy, setBusy] = useState(false);

  async function onCheck() {
    setBusy(true);
    try {
      await window.tbh.checkForUpdates();
    } catch (err) {
      reportIpcError(err);
    } finally {
      setBusy(false);
    }
  }

  async function onDownload() {
    setBusy(true);
    try {
      await window.tbh.downloadUpdate();
    } catch (err) {
      reportIpcError(err);
    } finally {
      setBusy(false);
    }
  }

  function onInstall() {
    void window.tbh.quitAndInstall().catch(reportIpcError);
  }

  const phase = status?.phase ?? "idle";
  const isDisabled = phase === "disabled";
  const isChecking = phase === "checking" || busy;
  const canCheck = !isDisabled && !isChecking && phase !== "downloading" && phase !== "ready";
  const canDownload = phase === "available" && !busy;
  const canInstall = phase === "ready";
  const percent = status?.percent !== undefined ? Math.min(100, Math.round(status.percent)) : 0;
  const message = status ? statusMessage(status) : null;
  const showReleaseLink = status?.availableVersion && (phase === "available" || phase === "ready");

  return (
    <TabPage>
      <TabHeader
        title="About"
        intro="TBH Companion is an unofficial fan tool for Task Bar Hero. It reads your local save only — it never changes your save or connects to game servers."
      />

      <div className="flex flex-col gap-3.5">
        <Section title="Version">
          <p className="m-0">
            <strong>v{status?.currentVersion ?? "…"}</strong>
          </p>
          <p className="m-0 flex flex-wrap items-center gap-2 text-xs">
            <ButtonLink href={GITHUB_REPO} size="sm">
              <SiGithub className="size-3.5" aria-hidden />
              <span>GitHub</span>
            </ButtonLink>
            <ButtonLink href={DISCORD_URL} size="sm">
              <SiDiscord className="size-3.5" aria-hidden />
              <span>Discord</span>
            </ButtonLink>
          </p>
          <p className="m-0 max-w-2xl text-xs text-muted">
            Not affiliated with Tesseract Studio. Fan-made companion for personal stats and
            inventory valuation.
          </p>
        </Section>

        {!isDisabled && (
          <Section title="Updates" className="max-w-md">
            {message && (
              <p className={`m-0 ${phase === "error" ? "text-accent" : "text-muted"}`}>{message}</p>
            )}

            {phase === "downloading" && (
              <ProgressBar
                percent={percent}
                label={
                  <span className="text-xs text-muted">
                    {percent}%
                    {status?.transferred && status?.total
                      ? ` — ${fmtBytes(status.transferred)} / ${fmtBytes(status.total)}`
                      : ""}
                  </span>
                }
              />
            )}

            {showReleaseLink && (
              <p className="m-0 text-xs">
                <ExternalLink href={githubReleaseUrl(status.availableVersion!)}>
                  v{status.availableVersion} on GitHub
                </ExternalLink>
              </p>
            )}

            <div className="mt-1 flex flex-wrap gap-2">
              {canCheck && (
                <Button variant="primary" disabled={isChecking} onClick={() => void onCheck()}>
                  {isChecking ? "Checking…" : "Check for updates"}
                </Button>
              )}
              {canDownload && (
                <Button variant="primary" onClick={() => void onDownload()}>
                  Download update
                </Button>
              )}
              {canInstall && (
                <Button variant="primary" onClick={onInstall}>
                  Restart to install
                </Button>
              )}
            </div>

            {canInstall && (
              <p className="m-0 text-xs text-muted">
                Restart closes the main window, Mini overlay, and stage boss chest tracker, then
                installs over your existing folder. Windows may show an unsigned-app warning —
                choose More info, then Run anyway (same as the first install).
              </p>
            )}

            {phase === "idle" && (
              <p className="m-0 text-xs text-muted">
                Check for updates to see if a newer version is on GitHub.
              </p>
            )}
          </Section>
        )}
      </div>
    </TabPage>
  );
}
