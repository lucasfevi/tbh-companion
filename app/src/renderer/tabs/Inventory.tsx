import { useEffect, useMemo, useState } from "react";
import { useInventory } from "../lib/useInventory";
import { SteamPriceProgress } from "../components/market/SteamPriceProgress";
import { rowMatchesAnyLocation } from "../../core/inventory/location";
import {
  filterAndSortRows,
  gradeOptionsFromInventory,
  typeOptionsFromInventory,
  defaultSortDir,
  type SortKey,
  type LocationFilter,
} from "../lib/inventoryFilters";
import { InventorySummary } from "../components/inventory/InventorySummary";
import { InventoryFilters } from "../components/inventory/InventoryFilters";
import { InventoryTable } from "../components/inventory/InventoryTable";
import { TabHeader } from "../components/ui/TabHeader";
import { TabPage } from "../components/ui/TabPage";

export function Inventory({ onOpenChests }: { onOpenChests?: () => void }) {
  const inv = useInventory();
  const [query, setQuery] = useState("");
  const [tradableOnly, setTradableOnly] = useState(false);
  const [inUseOnly, setInUseOnly] = useState(false);
  const [gradeFilter, setGradeFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    if (!inv) return;
    if (gradeFilter !== "ALL" && !inv.rows.some((r) => r.grade === gradeFilter)) {
      setGradeFilter("ALL");
    }
    if (typeFilter !== "ALL" && !inv.rows.some((r) => r.type === typeFilter)) {
      setTypeFilter("ALL");
    }
    if (locationFilter !== "ALL" && !rowMatchesAnyLocation(inv.rows, locationFilter)) {
      setLocationFilter("ALL");
    }
  }, [inv, gradeFilter, typeFilter, locationFilter]);

  const gradeOptions = useMemo(() => (inv ? gradeOptionsFromInventory(inv) : []), [inv]);
  const typeOptions = useMemo(() => (inv ? typeOptionsFromInventory(inv) : []), [inv]);

  const rows = useMemo(() => {
    if (!inv) return [];
    return filterAndSortRows(inv, {
      query,
      tradableOnly,
      inUseOnly,
      gradeFilter,
      typeFilter,
      locationFilter,
      sortKey,
      sortDir,
    });
  }, [
    inv,
    query,
    tradableOnly,
    inUseOnly,
    gradeFilter,
    typeFilter,
    locationFilter,
    sortKey,
    sortDir,
  ]);

  if (!inv) {
    return (
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-lg font-semibold">Inventory</h1>
        <p className="m-0 text-muted">
          Waiting for the save file... open the game so it writes a save.
        </p>
      </div>
    );
  }

  const chestTotal = inv.chests.reduce((s, x) => s + x.quantity, 0);
  const currency = inv.currency ?? "USD";
  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(defaultSortDir(key));
    }
  }

  function clearFilters() {
    setQuery("");
    setTradableOnly(false);
    setInUseOnly(false);
    setGradeFilter("ALL");
    setTypeFilter("ALL");
    setLocationFilter("ALL");
  }

  return (
    <TabPage>
      <TabHeader title="Inventory" />

      <InventorySummary
        inv={inv}
        chestTotal={chestTotal}
        currency={currency}
        onViewChests={chestTotal > 0 ? onOpenChests : undefined}
      />

      <SteamPriceProgress variant="banner" />

      <InventoryFilters
        query={query}
        tradableOnly={tradableOnly}
        inUseOnly={inUseOnly}
        gradeFilter={gradeFilter}
        typeFilter={typeFilter}
        locationFilter={locationFilter}
        gradeOptions={gradeOptions}
        typeOptions={typeOptions}
        shownCount={rows.length}
        onQueryChange={setQuery}
        onTradableOnlyChange={setTradableOnly}
        onInUseOnlyChange={setInUseOnly}
        onGradeFilterChange={setGradeFilter}
        onTypeFilterChange={setTypeFilter}
        onLocationFilterChange={setLocationFilter}
      />

      <InventoryTable
        rows={rows}
        currency={currency}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={toggleSort}
        onClearFilters={clearFilters}
      />
    </TabPage>
  );
}
