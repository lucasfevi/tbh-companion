# TBH Companion — UX reference

Read this file when implementing a **new tab from scratch** or a **large layout refactor** that needs more examples than SKILL.md.

## Inventory header (canonical)

```tsx
<div className="inventory">
  <h1>Inventory</h1>
  <InventorySummary ... />
  {/* filters, then table */}
</div>
```

Loading state keeps the same title:

```tsx
<div className="placeholder">
  <h1>Inventory</h1>
  <p className="muted">Waiting for the save file...</p>
</div>
```

## Chests header (compact + CTA)

```tsx
<TabHeader title="Chests" intro="One-line explainer.">
  <div className="chests-header-actions">
    <button type="button" className="btn primary" onClick={() => window.tbh.openBoxTracker()}>
      Open Stage chest tracker
    </button>
  </div>
</TabHeader>
<div className="chest-grid">{/* three .chest-card */}</div>
```

## App chrome markup

See `App.tsx`: `.app-chrome` wraps `.tabs` + `AppToolbar`; `.savebar` is a sibling below.

## Brand notes

Product name in UI: **TBH Companion**. Dark theme only for now. See `docs/design/branding.md` for naming/disclaimer context — do not paste trademark-heavy copy into every tab.
