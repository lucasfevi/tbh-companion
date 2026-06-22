import { useCallback, useMemo, useState } from "react";
import { useLookupCatalog } from "../lib/useLookupCatalog";
import { useLookupSources } from "../lib/useLookupSources";
import { useLookupNav, type LookupNavNode } from "../lib/useLookupNav";
import { buildBoxNameIndex, buildStageNameIndex } from "../lib/lookupGraph";
import {
  classOptionsFromItems,
  defaultLookupSortDir,
  effectOptionsFromItems,
  filterAndSortItems,
  gearTypeOptionsFromItems,
  gradeOptionsFromItems,
  levelOptionsFromItems,
  materialKindOptionsFromItems,
  targetGroupOptionsFromItems,
  typeOptionsFromItems,
  type LookupSortKey,
} from "../lib/lookupFilters";
import { TabHeader } from "../design-system/primitives/TabHeader/TabHeader";
import { TabPage } from "../design-system/primitives/TabPage/TabPage";
import { BottomSheet } from "../design-system/primitives/BottomSheet/BottomSheet";
import { LookupFilters } from "../components/lookup/LookupFilters";
import { ItemCard } from "../components/lookup/ItemCard";
import { EntityDetail } from "../components/lookup/EntityDetail";
import { BackToTop } from "../components/lookup/BackToTop";

export function Lookup() {
  const items = useLookupCatalog();
  const sources = useLookupSources();
  const nav = useLookupNav();
  const [sheetOpen, setSheetOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [gradeFilter, setGradeFilter] = useState("ALL");
  const [gearTypeFilter, setGearTypeFilter] = useState("ALL");
  const [classFilter, setClassFilter] = useState("ALL");
  const [materialKindFilter, setMaterialKindFilter] = useState("ALL");
  const [effectFilter, setEffectFilter] = useState("ALL");
  const [targetGroupFilter, setTargetGroupFilter] = useState("ALL");
  const [uniqueOnly, setUniqueOnly] = useState(false);
  const [minLevel, setMinLevel] = useState<number | null>(null);
  const [maxLevel, setMaxLevel] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<LookupSortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function handleTypeFilterChange(value: string) {
    setTypeFilter(value);
    // Hidden filters shouldn't silently keep filtering once their controls
    // disappear — e.g. a leftover class filter would zero out every material.
    if (value === "MATERIAL") {
      setGearTypeFilter("ALL");
      setClassFilter("ALL");
      setMinLevel(null);
      setMaxLevel(null);
      setUniqueOnly(false);
    } else if (value === "GEAR") {
      setMaterialKindFilter("ALL");
      setTargetGroupFilter("ALL");
    }
  }

  function toggleSortDir() {
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  }

  function handleSortKeyChange(key: LookupSortKey) {
    setSortKey(key);
    setSortDir(defaultLookupSortDir(key));
  }

  const itemIndex = useMemo(() => new Map((items ?? []).map((item) => [item.id, item])), [items]);
  const boxNames = useMemo(() => (sources ? buildBoxNameIndex(sources) : new Map()), [sources]);
  const stageNames = useMemo(() => (sources ? buildStageNameIndex(sources) : new Map()), [sources]);

  const labelFor = useCallback(
    (node: LookupNavNode): string => {
      if (node.type === "item") return itemIndex.get(node.id)?.name ?? `Item #${node.id}`;
      if (node.type === "box") return boxNames.get(node.id) ?? `Box #${node.id}`;
      return stageNames.get(node.id) ?? `Stage #${node.id}`;
    },
    [itemIndex, boxNames, stageNames],
  );

  const filtered = useMemo(() => {
    if (!items) return [];
    return filterAndSortItems(items, {
      query,
      typeFilter,
      gradeFilter,
      gearTypeFilter,
      classFilter,
      materialKindFilter,
      effectFilter,
      targetGroupFilter,
      uniqueOnly,
      minLevel,
      maxLevel,
      sortKey,
      sortDir,
    });
  }, [
    items,
    query,
    typeFilter,
    gradeFilter,
    gearTypeFilter,
    classFilter,
    materialKindFilter,
    effectFilter,
    targetGroupFilter,
    uniqueOnly,
    minLevel,
    maxLevel,
    sortKey,
    sortDir,
  ]);

  if (!items || !sources) {
    return (
      <TabPage>
        <TabHeader title="Lookup" />
        <p className="m-0 text-muted">Loading item catalog…</p>
      </TabPage>
    );
  }

  return (
    <TabPage>
      <TabHeader
        title="Lookup"
        intro="Browse every obtainable item, its stats, and where to find it."
      />

      <LookupFilters
        query={query}
        typeFilter={typeFilter}
        gradeFilter={gradeFilter}
        gearTypeFilter={gearTypeFilter}
        classFilter={classFilter}
        materialKindFilter={materialKindFilter}
        effectFilter={effectFilter}
        targetGroupFilter={targetGroupFilter}
        uniqueOnly={uniqueOnly}
        minLevel={minLevel}
        maxLevel={maxLevel}
        sortKey={sortKey}
        sortDir={sortDir}
        gradeOptions={gradeOptionsFromItems(items)}
        typeOptions={typeOptionsFromItems(items)}
        gearTypeOptions={gearTypeOptionsFromItems(items)}
        classOptions={classOptionsFromItems(items)}
        materialKindOptions={materialKindOptionsFromItems(items)}
        effectOptions={effectOptionsFromItems(items)}
        targetGroupOptions={targetGroupOptionsFromItems(items)}
        levelOptions={levelOptionsFromItems(items)}
        shownCount={filtered.length}
        onQueryChange={setQuery}
        onTypeFilterChange={handleTypeFilterChange}
        onGradeFilterChange={setGradeFilter}
        onGearTypeFilterChange={setGearTypeFilter}
        onClassFilterChange={setClassFilter}
        onMaterialKindFilterChange={setMaterialKindFilter}
        onEffectFilterChange={setEffectFilter}
        onTargetGroupFilterChange={setTargetGroupFilter}
        onUniqueOnlyChange={setUniqueOnly}
        onMinLevelChange={setMinLevel}
        onMaxLevelChange={setMaxLevel}
        onSortKeyChange={handleSortKeyChange}
        onSortDirToggle={toggleSortDir}
      />

      <ul className="m-0 grid min-w-0 grid-cols-3 gap-2.5 p-0 max-[900px]:grid-cols-2 max-[600px]:grid-cols-1">
        {filtered.length === 0 ? (
          <li className="col-span-full text-xs text-muted">No items match these filters.</li>
        ) : (
          filtered.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onSelect={(i) => {
                nav.push({ type: "item", id: i.id });
                setSheetOpen(true);
              }}
            />
          ))
        )}
      </ul>

      <BackToTop />

      <BottomSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={nav.current ? labelFor(nav.current) : "Details"}
      >
        {nav.current ? (
          <EntityDetail
            node={nav.current}
            itemIndex={itemIndex}
            sources={sources}
            labelFor={labelFor}
            onNavigate={nav.push}
          />
        ) : null}
      </BottomSheet>
    </TabPage>
  );
}
