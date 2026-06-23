import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { useLookupCatalog } from "../lib/useLookupCatalog";
import { useLookupSources } from "../lib/useLookupSources";
import { useLookupSynthesisModel } from "../lib/useLookupSynthesisModel";
import { useOfferings } from "../lib/useOfferings";
import { useLookupNav, type LookupNavNode } from "../lib/useLookupNav";
import type { LookupItem } from "../../../shared/types";
import { buildBoxNameIndex, buildStageNameIndex } from "../lib/lookupGraph";
import {
  defaultLookupSortDir,
  effectGroupsFromItems,
  filterAndSortItems,
  gearTypeGroupsFromItems,
  gradeOptionsFromItems,
  LEVEL_MAX,
  LEVEL_MIN,
  materialKindOptionsFromItems,
  typeOptionsFromItems,
  type LookupSortKey,
} from "../lib/lookupFilters";
import { TabHeader } from "../design-system/primitives/TabHeader/TabHeader";
import { TabPage } from "../design-system/primitives/TabPage/TabPage";
import { SidePanel } from "../design-system/primitives/SidePanel/SidePanel";
import { LookupFilters } from "../components/lookup/LookupFilters";
import { ItemCard } from "../components/lookup/ItemCard";
import { EntityDetail } from "../components/lookup/EntityDetail";
import { BackToTop } from "../components/lookup/BackToTop";

export function Lookup() {
  const items = useLookupCatalog();
  const sources = useLookupSources();
  const synthesisModel = useLookupSynthesisModel();
  const offerings = useOfferings();
  const nav = useLookupNav();
  const [panelOpen, setPanelOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [gradeFilter, setGradeFilter] = useState<string[]>([]);
  const [gearTypeFilter, setGearTypeFilter] = useState<string[]>([]);
  const [materialKindFilter, setMaterialKindFilter] = useState<string[]>([]);
  const [effectFilter, setEffectFilter] = useState<string[]>([]);
  const [uniqueOnly, setUniqueOnly] = useState(false);
  const [levelRange, setLevelRange] = useState<[number, number]>([LEVEL_MIN, LEVEL_MAX]);
  const [sortKey, setSortKey] = useState<LookupSortKey>("grade");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const deferredQuery = useDeferredValue(query);

  function handleTypeFilterChange(next: string[]) {
    setTypeFilter(next);
    // Hidden multi-select sub-filters shouldn't silently keep filtering once
    // their controls disappear — e.g. a leftover class filter would zero out
    // every material. The level range persists by design (it's material-safe).
    const gearVisible = next.length === 0 || next.includes("GEAR");
    const materialVisible = next.length === 0 || next.includes("MATERIAL");
    if (!gearVisible) {
      setGearTypeFilter([]);
      setUniqueOnly(false);
    }
    if (!materialVisible) {
      setMaterialKindFilter([]);
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
      query: deferredQuery,
      typeFilter,
      gradeFilter,
      gearTypeFilter,
      materialKindFilter,
      effectFilter,
      uniqueOnly,
      levelRange,
      sortKey,
      sortDir,
    });
  }, [
    items,
    deferredQuery,
    typeFilter,
    gradeFilter,
    gearTypeFilter,
    materialKindFilter,
    effectFilter,
    uniqueOnly,
    levelRange,
    sortKey,
    sortDir,
  ]);

  const { push: navPush } = nav;
  const handleItemSelect = useCallback(
    (item: LookupItem) => {
      navPush({ type: "item", id: item.id });
      setPanelOpen(true);
    },
    [navPush],
  );

  const gradeOptions = useMemo(() => (items ? gradeOptionsFromItems(items) : []), [items]);
  const typeOptions = useMemo(() => (items ? typeOptionsFromItems(items) : []), [items]);
  const gearTypeGroups = useMemo(() => (items ? gearTypeGroupsFromItems(items) : []), [items]);
  const materialKindOptions = useMemo(
    () => (items ? materialKindOptionsFromItems(items) : []),
    [items],
  );
  const effectGroups = useMemo(() => (items ? effectGroupsFromItems(items) : []), [items]);

  if (!items || !sources || !synthesisModel) {
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
        materialKindFilter={materialKindFilter}
        effectFilter={effectFilter}
        uniqueOnly={uniqueOnly}
        levelRange={levelRange}
        sortKey={sortKey}
        sortDir={sortDir}
        gradeOptions={gradeOptions}
        typeOptions={typeOptions}
        gearTypeGroups={gearTypeGroups}
        materialKindOptions={materialKindOptions}
        effectGroups={effectGroups}
        shownCount={filtered.length}
        onQueryChange={setQuery}
        onTypeFilterChange={handleTypeFilterChange}
        onGradeFilterChange={setGradeFilter}
        onGearTypeFilterChange={setGearTypeFilter}
        onMaterialKindFilterChange={setMaterialKindFilter}
        onEffectFilterChange={setEffectFilter}
        onUniqueOnlyChange={setUniqueOnly}
        onLevelRangeChange={setLevelRange}
        onSortKeyChange={handleSortKeyChange}
        onSortDirToggle={toggleSortDir}
      />

      <ul className="m-0 grid min-w-0 grid-cols-3 gap-2.5 p-0 max-[900px]:grid-cols-2 max-[600px]:grid-cols-1">
        {filtered.length === 0 ? (
          <li className="col-span-full text-xs text-muted">No items match these filters.</li>
        ) : (
          filtered.map((item) => <ItemCard key={item.id} item={item} onSelect={handleItemSelect} />)
        )}
      </ul>

      <BackToTop />

      <SidePanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        title={nav.current ? labelFor(nav.current) : "Details"}
      >
        {nav.current ? (
          <EntityDetail
            node={nav.current}
            itemIndex={itemIndex}
            sources={sources}
            synthesisModel={synthesisModel}
            offerings={offerings}
            labelFor={labelFor}
            onNavigate={nav.push}
          />
        ) : null}
      </SidePanel>
    </TabPage>
  );
}
