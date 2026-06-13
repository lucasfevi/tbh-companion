import { describe, it, expect } from "vitest";
import {
  DEFAULT_NOTIFICATION_PREFS,
  migrateNotificationPrefs,
  sanitizeNotificationSoundId,
} from "../../shared/notificationCatalog";

describe("sanitizeNotificationSoundId", () => {
  it("accepts catalog ids and none", () => {
    expect(sanitizeNotificationSoundId("soft-chime", "wood-tick")).toBe("soft-chime");
    expect(sanitizeNotificationSoundId("none", "soft-chime")).toBe("none");
  });

  it("falls back for unknown ids", () => {
    expect(sanitizeNotificationSoundId("not-a-real-sound", "double-tap")).toBe("double-tap");
    expect(sanitizeNotificationSoundId(undefined, "whisper-ping")).toBe("whisper-ping");
  });
});

describe("migrateNotificationPrefs", () => {
  it("returns defaults when no legacy or new prefs exist", () => {
    expect(migrateNotificationPrefs({})).toEqual(DEFAULT_NOTIFICATION_PREFS);
  });

  it("merges partial notificationPrefs over defaults", () => {
    expect(
      migrateNotificationPrefs({
        notificationPrefs: {
          chestDrop: { enabled: false, sound: "bright-pop" },
        },
      }).chestDrop,
    ).toEqual({ enabled: false, sound: "bright-pop" });
  });

  it("migrates legacy chestSoundVariant to chestReady", () => {
    const prefs = migrateNotificationPrefs({ chestSoundVariant: "double-tap" });
    expect(prefs.chestReady).toEqual({ enabled: true, sound: "double-tap" });
    expect(prefs.chestDrop).toEqual(DEFAULT_NOTIFICATION_PREFS.chestDrop);
  });

  it("disables chestReady when legacy variant was none", () => {
    const prefs = migrateNotificationPrefs({ chestSoundVariant: "none" });
    expect(prefs.chestReady.enabled).toBe(false);
    expect(prefs.chestReady.sound).toBe("soft-chime");
  });

  it("sanitizes invalid sound ids in notificationPrefs", () => {
    const prefs = migrateNotificationPrefs({
      notificationPrefs: {
        chestDrop: { enabled: true, sound: "bogus-id" as "soft-chime" },
      },
    });
    expect(prefs.chestDrop.sound).toBe(DEFAULT_NOTIFICATION_PREFS.chestDrop.sound);
  });
});
