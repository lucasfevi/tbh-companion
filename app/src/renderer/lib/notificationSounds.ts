import { Howl } from "howler";

import {
  notificationSoundFile,
  sanitizeNotificationVolume,
  type NotificationSoundId,
} from "../../../shared/notificationCatalog";
import type { NotificationSoundPayload } from "../../../shared/types";

const soundUrlByFile = import.meta.glob<string>("../../../resources/sounds/*.wav", {
  eager: true,
  query: "?url",
  import: "default",
});

const urlByFilename = new Map<string, string>();
for (const [path, url] of Object.entries(soundUrlByFile)) {
  const filename = path.split("/").pop();
  if (filename) urlByFilename.set(filename, url);
}

const howlBySoundId = new Map<NotificationSoundId, Howl>();

function getHowl(soundId: NotificationSoundId): Howl | null {
  const cached = howlBySoundId.get(soundId);
  if (cached) return cached;

  const filename = notificationSoundFile(soundId);
  if (!filename) return null;
  const src = urlByFilename.get(filename);
  if (!src) return null;

  const howl = new Howl({ src: [src], preload: true });
  howlBySoundId.set(soundId, howl);
  return howl;
}

export function playNotificationSound(soundId: NotificationSoundId, volumePercent: number): void {
  const volume = sanitizeNotificationVolume(volumePercent);
  if (soundId === "none" || volume <= 0) return;

  const howl = getHowl(soundId);
  if (!howl) return;

  howl.volume(volume / 100);
  howl.play();
}

export function handleNotificationSoundPayload(payload: NotificationSoundPayload): void {
  playNotificationSound(payload.soundId, payload.volumePercent);
}
