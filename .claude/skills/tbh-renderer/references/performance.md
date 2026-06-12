# TBH renderer — performance reference

Forked from Vercel react-best-practices; trimmed for Electron + Vite client-only React. Read when optimizing or reviewing renderer hot paths.

## Bundle size (CRITICAL)

### Avoid barrel imports

Import from the concrete module path when a library re-exports thousands of symbols (e.g. icon packs). Prefer direct file imports or project `components/ui/` wrappers.

### Dynamic imports

Lazy-load large tabs, editors, or charts not needed on initial paint:

```tsx
const HeavyPanel = lazy(() => import("./HeavyPanel"));
```

Use inside the tab that needs it, with `Suspense` fallback matching TBH skeleton styles (`bg-panel`, `animate-pulse`).

### Defer non-critical code

Analytics or dev-only helpers: load after first paint, not in the critical path to tab bar render.

## Re-renders (HIGH)

### Derive during render

```tsx
// Avoid: effect copies props to state
const fullName = `${first} ${last}`;
```

Do not `useEffect(() => setX(prop), [prop])` when `X` can be computed from `prop` during render.

### Functional setState

```tsx
setItems((curr) => curr.filter((row) => row.id !== id));
```

Use in IPC callbacks so handlers stay stable without listing `items` in `useCallback` deps.

### Narrow effect dependencies

Prefer `user.id` over `user` in dependency arrays when only id matters.

### Interaction in event handlers

Side effects that follow a click/submit belong in the handler, not `useState` + `useEffect`.

### useRef for transient values

High-frequency values (scroll position, drag) that should not re-render every frame → `useRef`, update DOM or child refs directly.

### useTransition for filters

```tsx
const [isPending, startTransition] = useTransition();
startTransition(() => setQuery(value));
```

## Rendering (MEDIUM)

### content-visibility for long lists

```css
.inventory-row {
  content-visibility: auto;
  contain-intrinsic-size: 0 48px;
}
```

### Conditional render

Use `count > 0 ? <Badge /> : null` when `count` can be `0` — `count && <Badge />` renders `0`.

### Animate wrapper divs

Apply CSS transforms to a wrapping `div`, not the root `<svg>`, for smoother animations.

## JavaScript (LOW–MEDIUM)

### Map/Set for repeated lookups

Build `Map` once when matching many inventory rows to catalog entries by id.

### toSorted for immutability

```tsx
const sorted = useMemo(() => rows.toSorted((a, b) => a.name.localeCompare(b.name)), [rows]);
```

Never `.sort()` on props or state arrays in place.

### Combine iterations

One loop over rows when computing multiple tallies instead of three `.filter()` passes.

## Not applicable (skip)

- Server Components, `React.cache()` per HTTP request, LRU cross-request caches
- `next/dynamic`, server actions, `after()` from `next/server`
- SWR unless the project adopts it globally
- Hydration mismatch scripts (Electron loads client bundle; no SSR HTML mismatch for app shell)
