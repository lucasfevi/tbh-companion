# Context — filtering-sorting-refinements

User decisions captured during Specify/Discuss (2026-06-23). These resolve the
gray areas; design and tasks build on them.

## Decisions

- **[R1] Final Modifier grouping** (authored, no group field exists in
  `lookup_items.json`). 39 stat keys → 4 groups:
  - **Offense (18):** AttackDamage, AttackSpeed, CastSpeed, CriticalChance,
    CriticalDamage, Multistrike, ProjectileCount, BaseAttackCountReduction,
    IncreaseMeleeDamage, IncreaseProjectileDamage, IncreaseSummonDamage,
    IncreaseAreaOfEffectDamage, PhysicalDamagePercent, FireDamagePercent,
    ColdDamagePercent, LightningDamagePercent, CooldownReduction, AreaOfEffect
  - **Defense (15):** MaxHp, Armor, BlockChance, DodgeChance, DamageReduction,
    DamageAbsorption, HpLeech, HpRegenPerSec, AddHpPerHit, AddHpPerKill,
    AllElementalResistance, FireResistance, ColdResistance, LightningResistance,
    ChaosResistance
  - **Util (2):** MovementSpeed, IncreaseExpAmount
  - **Skill (4):** AddAllSkillLevel, SkillDurationIncrease, SkillHealIncrease,
    SkillRangeExpansion
  - User explicitly moved CastSpeed / CooldownReduction / AreaOfEffect → Offense.
  - Unknown/future stat keys not in the map fall into a trailing **"Other"**
    group so nothing silently disappears.

- **[R2] Gear type grouping is data-derived**, not hardcoded: each item carries a
  `gearGroup` (WEAPON / ARMOR / ACCESSORY) in `lookup_items.json`. Group order:
  Weapon, Armor, Accessory. Offhands (Shield, Arrow, Orb, Tome, Bolt, Hatchet)
  are already `gearGroup: WEAPON`, so "Weapon includes offhands" is automatic.

- **[R3] Lookup Material setup** shows only: Item type, Grade, Modifier,
  Material kind. (Modifiers apply to materials because material outcomes grant
  stats.) No Gear type / Level / Unique-only for materials.

- **[R4] Remove the Class filter** (Knight/Ranger/...) entirely — the mocks omit
  it. Class still appears on item cards via `itemMetaLine`.

- **[R5] Lookup Item type = two Checkboxes** (Gear, Material), replacing the Type
  MultiSelect. State stays `string[]` (`[]` / `["GEAR"]` / `["MATERIAL"]` /
  both). Inventory's "Item type" stays a MultiSelect (3+ types, multi useful).

- **[R6] Offering Loot (Coin view) = search only.** Remove grade/type
  MultiSelects and the SortControl; always sort by drop % descending.

- **[R7] Sort control** moves before the search input and is restyled as a glued
  segmented button group (Bootstrap-style): the sort-key control and the
  direction toggle share borders, same height, no gap.

- **[R8] Performance work is a separate feature** (`lookup-filter-performance`),
  planned after these refinements ship. Logged in STATE.md deferred ideas +
  its own spec stub.

## Surfaces & sources verified

- `app/src/renderer/lib/lookupFilters.ts` — filter state + predicate + option
  helpers (effectOptionsFromItems, gearTypeOptionsFromItems, classOptions...).
- `app/src/renderer/components/lookup/LookupFilters.tsx` — current FilterBar
  layout with Type/Grade/Effect/GearSlot/Class MultiSelects, RangeSlider, Switch.
- `app/src/core/lookup/classRestriction.ts` — class mapping (to be unused by the
  filter once Class is removed; keep for item-card meta line).
- `app/src/renderer/design-system/primitives/MultiSelect/MultiSelect.tsx` —
  popup `py-1` plus searchable input `pt-1`; top-space bug lives here.
- `data/lookup_items.json` — 1511 items; gearGroup→gearType + 39 stat keys
  enumerated (see [R1]/[R2]).
- Old-checkbox stories: `Popover.stories.tsx`, `Field.stories.tsx`.
