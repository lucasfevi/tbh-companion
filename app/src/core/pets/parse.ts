import { unwrapEs3Entry } from "../save/snapshot";

export interface PetSaveRow {
  petKey: number;
  unlocked: boolean;
  viewed: boolean;
}

function toNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function playerFromText(decryptedText: string): Record<string, unknown> | null {
  const root = JSON.parse(decryptedText) as Record<string, unknown>;
  const player = unwrapEs3Entry(root?.PlayerSaveData) as Record<string, unknown> | undefined;
  return player && typeof player === "object" ? player : null;
}

export function parsePetSaveData(decryptedText: string): PetSaveRow[] {
  const player = playerFromText(decryptedText);
  if (!player) return [];

  const arr = player.PetSaveData;
  if (!Array.isArray(arr)) return [];

  const out: PetSaveRow[] = [];
  for (const raw of arr) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const petKey = Math.trunc(toNum(row.PetKey, 0));
    if (petKey <= 0) continue;
    out.push({
      petKey,
      unlocked: Boolean(row.IsUnlock),
      viewed: Boolean(row.IsViewed),
    });
  }
  return out;
}

export function parseArrangedPetKey(decryptedText: string): number {
  const player = playerFromText(decryptedText);
  if (!player) return 0;
  const common = player.commonSaveData as Record<string, unknown> | undefined;
  if (!common || typeof common !== "object") return 0;
  return Math.trunc(toNum(common.ArrangedPetKey, 0));
}

/** Lifetime monster kill counts from aggregateSaveDatas Type 0 (SubKey = monster id). */
export function parseMonsterKillCounts(decryptedText: string): Map<number, number> {
  const player = playerFromText(decryptedText);
  if (!player) return new Map();

  const raw = player.aggregateSaveDatas;
  if (!Array.isArray(raw)) return new Map();

  const counts = new Map<number, number>();
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const type = Math.trunc(toNum(r.Type ?? r.type, -1));
    if (type !== 0) continue;
    const subKey = Math.trunc(toNum(r.SubKey ?? r.subKey, 0));
    if (subKey <= 0) continue;
    const value = Math.trunc(toNum(r.Value ?? r.value, 0));
    if (value <= 0) continue;
    counts.set(subKey, value);
  }
  return counts;
}
