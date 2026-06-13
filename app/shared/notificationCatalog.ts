/** Shared notification sound catalog and kind definitions (main + renderer). */

export const NOTIFICATION_SOUND_ENTRIES = [
  { id: "soft-chime", label: "Soft chime", file: "soft-chime.wav" },
  { id: "double-tap", label: "Double tap", file: "double-tap.wav" },
  { id: "wood-tick", label: "Wood tick", file: "wood-tick.wav" },
  { id: "whisper-ping", label: "Whisper ping", file: "whisper-ping.wav" },
  { id: "bright-pop", label: "Bright pop", file: "bright-pop.wav" },
  { id: "clear-bell", label: "Clear bell", file: "clear-bell.wav" },
  { id: "soft-ding", label: "Soft ding", file: "soft-ding.wav" },
  { id: "quick-rise", label: "Quick rise", file: "quick-rise.wav" },
  { id: "game-blip", label: "Game blip", file: "game-blip.wav" },
  { id: "arcade-tone", label: "Arcade tone", file: "arcade-tone.wav" },
  { id: "crystal-chime", label: "Crystal chime", file: "crystal-chime.wav" },
  { id: "happy-ping", label: "Happy ping", file: "happy-ping.wav" },
  { id: "magic-spark", label: "Magic spark", file: "magic-spark.wav" },
  { id: "level-triumph", label: "Level triumph", file: "level-triumph.wav" },
  { id: "treasure-fanfare", label: "Treasure fanfare", file: "treasure-fanfare.wav" },
  { id: "gentle-alert", label: "Gentle alert", file: "gentle-alert.wav" },
] as const;

export type NotificationSoundId = (typeof NOTIFICATION_SOUND_ENTRIES)[number]["id"] | "none";

export const NOTIFICATION_KIND_ENTRIES = [
  {
    id: "chestDrop",
    label: "Chest drop",
    description: "When a tracked stage boss drops a chest (Player.log or Dropped button).",
  },
  {
    id: "chestReady",
    label: "Chest ready",
    description: "When a tracked chest cooldown finishes.",
  },
  {
    id: "heroLevelUp",
    label: "Hero level up",
    description: "When a hero gains a level in the save file.",
  },
] as const;

export type NotificationKindId = (typeof NOTIFICATION_KIND_ENTRIES)[number]["id"];

export interface NotificationKindPreference {
  enabled: boolean;
  sound: NotificationSoundId;
}

export type NotificationPrefs = Record<NotificationKindId, NotificationKindPreference>;

/** Legacy chestSoundVariant values (pre notificationPrefs migration). */
export type LegacyChestSoundVariant =
  | "none"
  | "soft-chime"
  | "double-tap"
  | "wood-tick"
  | "whisper-ping";

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  chestDrop: { enabled: true, sound: "treasure-fanfare" },
  chestReady: { enabled: true, sound: "soft-chime" },
  heroLevelUp: { enabled: true, sound: "level-triumph" },
};

export function notificationSoundFile(soundId: NotificationSoundId): string {
  if (soundId === "none") return "";
  const entry = NOTIFICATION_SOUND_ENTRIES.find((s) => s.id === soundId);
  return entry?.file ?? "";
}

const VALID_SOUND_IDS = new Set<NotificationSoundId>([
  "none",
  ...NOTIFICATION_SOUND_ENTRIES.map((s) => s.id),
]);

export function sanitizeNotificationSoundId(
  sound: string | undefined,
  fallback: NotificationSoundId,
): NotificationSoundId {
  if (sound === "none") return "none";
  if (sound !== undefined && VALID_SOUND_IDS.has(sound as NotificationSoundId)) {
    return sound as NotificationSoundId;
  }
  return fallback;
}

function sanitizeKindPreference(
  kind: NotificationKindId,
  pref: Partial<NotificationKindPreference> | undefined,
): NotificationKindPreference {
  const defaults = DEFAULT_NOTIFICATION_PREFS[kind];
  return {
    enabled: pref?.enabled ?? defaults.enabled,
    sound: sanitizeNotificationSoundId(pref?.sound, defaults.sound),
  };
}

export function sanitizeNotificationPrefs(prefs: NotificationPrefs): NotificationPrefs {
  return {
    chestDrop: sanitizeKindPreference("chestDrop", prefs.chestDrop),
    chestReady: sanitizeKindPreference("chestReady", prefs.chestReady),
    heroLevelUp: sanitizeKindPreference("heroLevelUp", prefs.heroLevelUp),
  };
}

export function migrateNotificationPrefs(
  raw: Partial<{
    chestSoundVariant?: LegacyChestSoundVariant;
    notificationPrefs?: NotificationPrefs;
  }>,
): NotificationPrefs {
  if (raw.notificationPrefs) {
    return sanitizeNotificationPrefs({
      ...DEFAULT_NOTIFICATION_PREFS,
      ...raw.notificationPrefs,
      chestDrop: { ...DEFAULT_NOTIFICATION_PREFS.chestDrop, ...raw.notificationPrefs.chestDrop },
      chestReady: { ...DEFAULT_NOTIFICATION_PREFS.chestReady, ...raw.notificationPrefs.chestReady },
      heroLevelUp: {
        ...DEFAULT_NOTIFICATION_PREFS.heroLevelUp,
        ...raw.notificationPrefs.heroLevelUp,
      },
    });
  }

  const legacy = raw.chestSoundVariant ?? "soft-chime";
  const legacySound = sanitizeNotificationSoundId(
    legacy === "none" ? "none" : legacy,
    "soft-chime",
  );

  return sanitizeNotificationPrefs({
    ...DEFAULT_NOTIFICATION_PREFS,
    chestReady: {
      enabled: legacy !== "none",
      sound: legacy === "none" ? "soft-chime" : legacySound,
    },
  });
}
