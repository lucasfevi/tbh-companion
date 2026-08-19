import { dirname, join } from "node:path";

/** Unity Player.log beside the TBH save file (LocalLow/.../TaskbarHero/Player.log). */
export function playerLogPathFromSave(savePath: string): string {
  return join(dirname(savePath), "Player.log");
}

const GET_BOX_COUNT_RE = /GetBoxCount Success Count\s*:\s*\d+\s*(?:\/\/|;)\s*ItemKey\s*:\s*(\d+)/gi;

export function parseGetBoxCountItemKeys(text: string): number[] {
  const keys: number[] = [];
  for (const match of text.matchAll(GET_BOX_COUNT_RE)) {
    const itemKey = Number.parseInt(match[1] ?? "", 10);
    if (itemKey > 0) keys.push(itemKey);
  }
  return keys;
}
