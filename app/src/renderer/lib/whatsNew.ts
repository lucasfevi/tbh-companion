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
    version: "1.16.0",
    title: "What's new in v1.16.0",
    bullets: [
      "New Lookup tab — browse 1,500+ items, boxes, and stages with search, filters, and sort.",
      "Every item shows stats plus Where to find: boss drops, crafting, synthesis, and Cube Offering coins.",
      "Open Offering coins to see full Cube loot tables; open boxes and stages for drop lists.",
      "Inventory filters for grade, item type, and location are now multi-select.",
    ],
  },
  {
    version: "1.15.0",
    title: "What's new in v1.15.0",
    bullets: [
      "Inventory instant sell totals now use the full buy-order book, with a badge when depth runs out.",
      "Market value and Instant total summary cards follow your active filters.",
      "Unequipped only filter and the Equipped column make mixed equip/stash rows easier to read.",
      "Optional Instant avg column in the column picker.",
    ],
  },
  {
    version: "1.13.0",
    title: "What's new in v1.13.0",
    bullets: [
      "New Discord button on About for community help and release chatter.",
      "What's New appears once after updates when a release includes bundled notes.",
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
