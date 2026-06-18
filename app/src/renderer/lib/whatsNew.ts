import { DISCORD_URL } from "./externalLinks";

export interface WhatsNewAction {
  label: string;
  href: string;
}

export interface WhatsNewEntry {
  version: string;
  title: string;
  bullets: string[];
  action?: WhatsNewAction;
}

export const WHATS_NEW_STORAGE_KEY = "tbh.whatsNew.lastSeenVersion";

const WHATS_NEW_ENTRIES: WhatsNewEntry[] = [
  {
    version: "1.12.0",
    title: "What's new in v1.12.0",
    bullets: [
      "New Discord button on About for community help and release chatter.",
      "What's New now appears once after updates when a release includes bundled notes.",
    ],
    action: {
      label: "Join Discord",
      href: DISCORD_URL,
    },
  },
];

export function whatsNewForVersion(version: string | undefined): WhatsNewEntry | null {
  if (!version) return null;
  const normalized = version.replace(/^v/, "").replace(/-dev$/, "");
  return WHATS_NEW_ENTRIES.find((entry) => entry.version === normalized) ?? null;
}

export function readLastSeenWhatsNewVersion(): string | null {
  try {
    return window.localStorage.getItem(WHATS_NEW_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function markWhatsNewSeen(version: string): void {
  try {
    window.localStorage.setItem(WHATS_NEW_STORAGE_KEY, version);
  } catch {
    // Ignore storage failures; dismissal should still close for this session.
  }
}
