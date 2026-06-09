import { useMemo, useState } from "react";
import { useInventory } from "../lib/useInventory";
import type { ResolvedInventoryRow } from "../../../shared/types";

// Rarity order (low -> high) for sorting + a color per grade.
const GRADE_ORDER = [
  "COMMON",
  "UNCOMMON",
  "RARE",
  "LEGENDARY",
  "IMMORTAL",
  "ARCANA",
  "BEYOND",
  "CELESTIAL",
  "DIVINE",
  "COSMIC",
];
const GRADE_RANK: Record<string, number> = Object.fromEntries(
  GRADE_ORDER.map((g, i) => [g, i]),
);
const GRADE_COLORS: Record<string, string> = {
  COMMON: "#9aa3b2",
  UNCOMMON: "#5ad17a",
  RARE: "#4aa3ff",
  LEGENDARY: "#e8c45a",
  IMMORTAL: "#ff6b6b",
  ARCANA: "#c46bff",
  BEYOND: "#ff8c42",
  CELESTIAL: "#4ad7d1",
  DIVINE: "#ffd9f0",
  COSMIC: "#a0f0ff",
  UNKNOWN: "#6b7280",
};

function gradeColor(grade: string): string {
  return GRADE_COLORS[grade] ?? GRADE_COLORS.UNKNOWN;
}

type SortKey = "name" | "grade" | "type" | "count";

export function Inventory() {
  const inv = useInventory();
  const [query, setQuery] = useState("");
  const [tradableOnly, setTradableOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("grade");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const rows = useMemo(() => {
    if (!inv) return [];
    const q = query.trim().toLowerCase();
    let r = inv.rows.filter((row) => {
      if (tradableOnly && !row.marketTradable) return false;
      if (q && !row.name.toLowerCase().includes(q)) return false;
      return true;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    r = [...r].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "type") cmp = a.type.localeCompare(b.type);
      else if (sortKey === "count") cmp = a.count - b.count;
      else cmp = (GRADE_RANK[a.grade] ?? -1) - (GRADE_RANK[b.grade] ?? -1);
      if (cmp === 0) cmp = b.count - a.count; // stable-ish tiebreak
      return cmp * dir;
    });
    return r;
  }, [inv, query, tradableOnly, sortKey, sortDir]);

  if (!inv) {
    return (
      <div className="placeholder">
        <h1>Inventory</h1>
        <p>Waiting for the save file... open the game so it writes a save.</p>
      </div>
    );
  }

  const c = inv.composition;
  const chestTotal = inv.chests.reduce((s, x) => s + x.quantity, 0);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" || key === "type" ? "asc" : "desc");
    }
  }

  const arrow = (key: SortKey) => (sortKey === key ? (sortDir === "asc" ? " \u25b2" : " \u25bc") : "");

  return (
    <div className="inventory">
      <h1>Inventory</h1>

      <div className="inv-cards">
        <div className="stat">
          <div className="stat-value">{c.total.toLocaleString()}</div>
          <div className="stat-label">items owned</div>
        </div>
        <div className="stat">
          <div className="stat-value">{inv.rows.length.toLocaleString()}</div>
          <div className="stat-label">distinct</div>
        </div>
        <div className="stat">
          <div className="stat-value">{c.tradableCount.toLocaleString()}</div>
          <div className="stat-label">market-tradable</div>
        </div>
        <div className="stat">
          <div className="stat-value">{chestTotal.toLocaleString()}</div>
          <div className="stat-label">unopened chests</div>
        </div>
      </div>

      <div className="grade-bars">
        {GRADE_ORDER.filter((g) => c.byGrade[g]).map((g) => (
          <div key={g} className="grade-bar" title={`${g}: ${c.byGrade[g]}`}>
            <span className="grade-dot" style={{ background: gradeColor(g) }} />
            <span className="grade-name" style={{ color: gradeColor(g) }}>
              {g[0] + g.slice(1).toLowerCase()}
            </span>
            <span className="grade-count">{c.byGrade[g]}</span>
          </div>
        ))}
      </div>

      {c.unknownCount > 0 && (
        <div className="inv-hint">
          {c.unknownCount} item(s) aren&apos;t in the catalog{" "}
          {inv.gameDataLoaded ? "(possibly added by a game update)" : "(catalog not loaded)"}.{" "}
          <button className="btn small-btn" onClick={() => void window.tbh.refreshGameData()}>
            Refresh game data
          </button>
        </div>
      )}

      <div className="inv-controls">
        <input
          className="inv-search"
          placeholder="Search items..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label className="inv-toggle">
          <input
            type="checkbox"
            checked={tradableOnly}
            onChange={(e) => setTradableOnly(e.target.checked)}
          />
          Tradable only
        </label>
        <span className="muted small">{rows.length} shown</span>
      </div>

      <table className="inv-table">
        <thead>
          <tr>
            <th onClick={() => toggleSort("name")}>Name{arrow("name")}</th>
            <th onClick={() => toggleSort("grade")}>Grade{arrow("grade")}</th>
            <th onClick={() => toggleSort("type")}>Type{arrow("type")}</th>
            <th className="num" onClick={() => toggleSort("count")}>
              Count{arrow("count")}
            </th>
            <th>Market</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row: ResolvedInventoryRow) => (
            <tr key={row.itemKey} className={row.known ? "" : "unknown-row"}>
              <td>
                <span className="grade-dot" style={{ background: gradeColor(row.grade) }} />
                {row.name}
                {row.chaoticCount > 0 && <span className="chaotic" title="Chaotic"> &#9670;</span>}
              </td>
              <td style={{ color: gradeColor(row.grade) }}>
                {row.grade[0] + row.grade.slice(1).toLowerCase()}
              </td>
              <td className="muted">{row.type}</td>
              <td className="num">{row.count}</td>
              <td>{row.marketTradable ? <span className="tradable">tradable</span> : <span className="muted">-</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
