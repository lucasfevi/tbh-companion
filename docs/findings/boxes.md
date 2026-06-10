# BoxData, chest capacity, and runes

Research spike against a live `SaveFile_Live.es3` (2026-06). See also
[`SAVE_FORMAT.md`](../SAVE_FORMAT.md) for the raw field layout.

## BoxData (held unopened chests)

`PlayerSaveData.BoxData` is three parallel arrays:

| Field | Role |
|-------|------|
| `BoxTypes[]` | Chest category id per slot |
| `BoxQuantity[]` | Count in that slot |
| `BoxUniqueId[]` | Internal slot ids (not used by companion) |

The companion already parses non-zero quantities in
[`app/src/core/inventory/parse.ts`](../../app/src/core/inventory/parse.ts).

### Observed BoxType values

| BoxType | Category | Notes |
|---------|----------|-------|
| `0` | **common** (gray) | Default stockpile slots (5 base before runes) |
| `1` | **rare** (blue) | Stage boss held slots (5 base before runes) |
| `2` | **act** (red) | Act boss held slots (5 base before runes) |

These are **slot category ids** in `BoxData`, not stage-box item ids (`910xxx` /
`920xxx` / `930xxx`).

### Capacity by chest type

Each type has its own base cap and rune chain (from
[taskbarhero.wiki runes.json](https://www.taskbarhero.wiki/data/runes.json)
`IconPath` keys):

| Chest type | Base cap | Rune effect | Bundled rune keys |
|------------|----------|-------------|-------------------|
| Common (gray) | 5 | Rune of Containment (`MaxAmountNormalChest`) | `rune_box_cap.json` → `common` |
| Stage boss (blue) | 5 | Rune of the Vault (`MaxAmountStageBossChest`) | `rune_box_cap.json` → `stageBoss` |
| Act boss (red) | 5 | Rune of Infinity (`MaxAmountActBossChest`) | `rune_box_cap.json` → `actBoss` |

Each purchased rune node adds **+1** slot (max level 1 on capacity nodes).

All three types start at **5 base slots**. Capacity formula per type:

```
capacity = baseCapacity (5)
         + sum(level for each purchased capacity rune of that type)
```

## RuneSaveData (purchased runes)

Purchased rune nodes live in `PlayerSaveData.RuneSaveData`:

```json
"RuneSaveData": [
  { "RuneKey": 1031, "Level": 1 },
  { "RuneKey": 11002, "Level": 1 }
]
```

- `RuneKey` — node id (matches [taskbarhero.org rune database](https://taskbarhero.org/en/runes/))
- `Level` — current upgrade level (`0` = not purchased)

**Common chest capacity** comes from **Rune of Containment** nodes
(`MaxAmountNormalChest`). **Stage boss** capacity uses **Rune of the Vault**
(`MaxAmountStageBossChest`). **Act boss** capacity uses **Rune of Infinity**
(`MaxAmountActBossChest`). Bundled ids in
[`data/rune_box_cap.json`](../../data/rune_box_cap.json) under `common`,
`stageBoss`, and `actBoss`.

**Rune of Expansion** nodes increase **inventory** slots, not chest capacity.
Inventory/stash runes are excluded from the cap catalog.

## Rare boss box farming (920xxx)

Rare boss box **drop cooldown** (~12 minutes) is **not** stored in the save.
The box-tracker overlay uses manual **Dropped** buttons with local persistence
(`box_timers.json` in app userData), inspired by community tools like
[taskbarhero.sbs](https://taskbarhero.sbs/).

Ideal farming stages are bundled in [`data/rare_box_routes.json`](../../data/rare_box_routes.json)
(community/wiki curated, no runtime fetch).
