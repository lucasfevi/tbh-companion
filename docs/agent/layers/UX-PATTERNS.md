# TBH Companion — UX reference

Read this file when implementing a **new tab from scratch** or a **large layout refactor** that needs more examples than [UX.md](UX.md).

## Inventory header (canonical)

```tsx
<TabPage>
  <TabHeader
    title="Inventory"
    intro="Valuation and filters for items in your save."
  />
  <InventorySummary ... />
  {/* filters, then table */}
</TabPage>
```

Loading state keeps the same title:

```tsx
<div className="flex flex-col gap-1.5">
  <h1 className="m-0 text-lg font-semibold">Inventory</h1>
  <p className="m-0 text-muted">Waiting for the save file...</p>
</div>
```

## Chests header (compact + CTA)

```tsx
<TabPage>
  <TabHeader title="Chests" intro="One-line explainer.">
    <div className="mt-2 flex flex-col items-start gap-1.5">
      <Button variant="primary" onClick={() => window.tbh.openBoxTracker()}>
        Open Stage chest tracker
      </Button>
    </div>
  </TabHeader>
  <div className="grid grid-cols-3 gap-2.5 max-[720px]:grid-cols-1">
    {/* Card per category */}
  </div>
</TabPage>
```

## App chrome markup

See `App.tsx`: tab `<nav>` + `AppToolbar` (`ToolbarButton` for Mini / Stage chests); save status bar is a sibling below the tab row.

## Brand notes

Product name in UI: **TBH Companion**. Dark theme only for now. Fan-made, unofficial companion — not affiliated with Tesseract Studio or the developers of TBH: Task Bar Hero. Keep disclaimer-style copy in **About** (see `app/src/renderer/tabs/About.tsx`) and `README.md`; do not paste trademark-heavy boilerplate into every tab.
