import { net } from "electron";
import type { AppConfig, Stats } from "../../../shared/types";
import { createLogger } from "../log";

const log = createLogger("discord");

function formatNumber(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export class DiscordWebhookService {
  private readonly getConfig: () => AppConfig;
  private readonly getStats: () => Stats | null;
  private intervalTimer: NodeJS.Timeout | null = null;
  private currentIntervalMs = 0;
  private wasRunning = false;

  constructor(getConfig: () => AppConfig, getStats: () => Stats | null) {
    this.getConfig = getConfig;
    this.getStats = getStats;
  }

  notifyChestDrop(name: string, level: number | null): void {
    const cfg = this.getConfig();
    if (!cfg.discordWebhookEnabled || !cfg.discordNotifyChestDrop || !cfg.discordWebhookUrl) return;
    const levelStr = level != null ? ` (Lv ${level})` : "";
    void this.send({ content: `🎁 **Stage boss chest dropped!** ${name}${levelStr}` });
  }

  notifyHeroLevelUp(heroName: string, newLevel: number): void {
    const cfg = this.getConfig();
    if (!cfg.discordWebhookEnabled || !cfg.discordNotifyHeroLevelUp || !cfg.discordWebhookUrl) return;
    void this.send({ content: `⬆️ **${heroName}** leveled up to **Level ${newLevel}!**` });
  }

  syncInterval(): void {
    const cfg = this.getConfig();
    const active = cfg.discordWebhookEnabled && cfg.discordWebhookUrl.trim().length > 0;

    if (active && !this.wasRunning) {
      this.wasRunning = true;
      void this.send({ content: "✅ **TBH Companion** webhook is now **running**." });
    } else if (!active && this.wasRunning) {
      this.wasRunning = false;
      void this.send({ content: "🔴 **TBH Companion** webhook has been **stopped**." });
    }

    const shouldRunStats = active && cfg.discordNotifyStatsReport;
    const intervalMs = Math.max(1, cfg.discordStatsReportIntervalMinutes) * 60_000;

    if (!shouldRunStats) {
      this.stopInterval();
      return;
    }

    if (this.intervalTimer && this.currentIntervalMs === intervalMs) return;

    this.stopInterval();
    this.currentIntervalMs = intervalMs;
    this.intervalTimer = setInterval(() => void this.sendStatsReport(), intervalMs);
  }

  stop(): void {
    if (this.wasRunning) {
      void this.send({ content: "🔴 **TBH Companion** has closed." });
      this.wasRunning = false;
    }
    this.stopInterval();
  }

  private stopInterval(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
      this.currentIntervalMs = 0;
    }
  }

  private sendStatsReport(): void {
    const cfg = this.getConfig();
    if (!cfg.discordWebhookEnabled || !cfg.discordNotifyStatsReport || !cfg.discordWebhookUrl) return;
    const stats = this.getStats();
    if (!stats?.connected) return;

    void this.send({
      embeds: [
        {
          title: "📊 TBH Companion — Stats Report",
          color: 3447003,
          fields: [
            { name: "Rolling XP/hr", value: formatNumber(stats.rollingRate), inline: true },
            { name: "Session XP/hr", value: formatNumber(stats.sessionRate), inline: true },
            { name: "Session XP", value: formatNumber(stats.cumulativeGained), inline: true },
            { name: "Gold/hr", value: formatNumber(stats.goldRate), inline: true },
            { name: "Session Gold", value: formatNumber(stats.goldGained), inline: true },
            { name: "Current Gold", value: formatNumber(stats.currentGold), inline: true },
            { name: "Session Time", value: formatDuration(stats.elapsed), inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    });
  }

  async testWebhook(url: string): Promise<{ ok: boolean; status?: number; error?: string }> {
    const trimmed = url.trim();
    if (!trimmed) return { ok: false, error: "Webhook URL is empty." };
    try {
      const res = await net.fetch(trimmed, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "🔔 **TBH Companion** webhook test — connection successful!" }),
      });
      if (res.ok || res.status === 204) return { ok: true, status: res.status };
      return { ok: false, status: res.status, error: `Discord returned ${res.status}` };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  private async send(body: object): Promise<void> {
    const url = this.getConfig().discordWebhookUrl.trim();
    if (!url) return;
    try {
      const res = await net.fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok && res.status !== 204) log.warn(`Discord webhook returned ${res.status}`);
    } catch (err) {
      log.warn(`Discord webhook failed: ${String(err)}`);
    }
  }
}
