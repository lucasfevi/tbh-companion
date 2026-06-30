# Changelog

User-facing changes for TBH Companion releases. Update the **[Unreleased]** section as features merge; move it to a version heading before tagging (Release prepare).

## [Unreleased]

## [1.18.0] - 2026-06-30

### Lookup

- **Lookup** tab now shows approximate Steam Market **listed prices** on grid cards, the item detail panel, and hover peek for tradable items — green accent with a Steam logo.
- Click a price (or **No listed price**) to open the item's Steam Market listing in your browser.
- Prices come from a shared snapshot refreshed about every 6 hours; switching currency in **Settings** or the **Market** tab re-resolves from the same cached file with no extra download.
- **Market** tab explains how Lookup prices differ from **Inventory** valuation and shows when Lookup prices were last updated.
- **Settings** adds **Clear Lookup market prices** to reset the cached snapshot.

### About

- **Buy Me a Coffee** support link in the tab bar (beside **Mini** and **Boss chests**) and on the **About** tab next to **GitHub** and **Discord**.

### UI

- Tooltips across the app now use styled, keyboard-reachable tooltips instead of OS-default hover delays (inventory badges, Live rates, filters, and similar controls). The mini overlay and Boss chests window keep native tooltips because frameless windows cannot host tooltip portals.

### Fixed

- Closing or reloading a window during Steam price fetches no longer logs render-frame disposal errors in the console.

## [1.17.0] - 2026-06-26

### Lookup

- Box detail panel: **Where to find** with per-stage spawn %, searchable loot table, and **First clear** treatment for one-time chests.
- Box hover peek shows the same stage ranges and drop sources summary as the detail header.
- Item **Drop** rows label first-clear chests with **First clear only**.
- Material pages now show a **Used in crafting** section listing every recipe that consumes the material.

### Inventory

- Item names in the **Inventory** table are now links; click any row to open its detail in the **Lookup** side panel.

### Fixed

- **Inventory** counts and totals no longer include Steam Market pipeline copies (items on Ship or listed for sale use duplicate save rows that the companion now ignores).
- Drop chances and pool percentages in **Lookup** now match game-extracted values, correcting over- and undercounts from earlier catalog entries.

### Data

- Bundled catalogs synced with game **v1.00.21**; item display texts match current in-game names.

## [1.16.1] - 2026-06-23

### Fixed

- Game item icons (gear, materials, boxes) now appear correctly in installed builds. Icons worked in dev but were missing from packaged releases because the build step copied JSON catalogs only, not the bundled `data/icons/` folder.

## [1.16.0] - 2026-06-23

### Lookup

- New **Lookup** tab: browse 1,500+ obtainable items, boxes, and stages with search, filters (grade, gear type, hero class, stat modifier, level range, material kind), and sort by name, grade, level, or type.
- Item detail shows base stats, inherent stats, unique effects, and **Where to find** — boss box drops, crafting recipes, synthesis formulas, and Cube **Offering** coins that can yield the item (with drop chance).
- Open any box or stage to see its drop table.
- Gear synthesis odds in the item detail panel; click any linked item, box, or stage to jump in a side panel without leaving the tab.
- **Offering** coins (Cube toss): full weighted loot table on the coin's detail page; search and sort by drop %.

### Inventory

- **Grade**, **Item type**, and **Location** filters are now multi-select — combine several grades, types, or locations at once.

### Data

- Bundled catalogs synced with game **1.00.19**; Lookup includes item icons for gear and materials.

## [1.15.0] - 2026-06-20

### Inventory

- **Instant total** now walks the full Steam buy-order book level by level (best price first), so large stacks no longer undercount proceeds when the top order cannot cover the whole stack. A badge appears when the book still cannot cover your full quantity.
- **Market value** and **Instant total** summary cards update with your active filters instead of always showing whole-inventory totals.
- **Unequipped only** filter replaces **In use only** — hides rows where every copy is equipped; rows with both equipped and stash/inventory copies still appear.
- **In use** column renamed to **Equipped**, with tooltips explaining per-row counts.
- Optional **Instant avg** column (hidden by default): average price per unit realized across the order-book levels used for instant sell.

### Fixed

- **Unequipped only** no longer hides items that have some copies equipped and others in inventory or stash.

## [1.14.0] - 2026-06-19

### Live

- **Inventory fill prediction** on the Live tab: estimate when unlocked inventory slots fill up from held chest auto-open (with companion toggles for common and stage boss chests) and session drop rates from Player.log.

### Notifications

- **Inventory almost full** alert with configurable fill threshold (Settings, default 90%) and **Happy ping** sound; shows a Windows toast with used/capacity when OS notifications are supported.

## [1.13.0] - 2026-06-18

### About

- **Discord** button on **About** next to **GitHub** — opens the TBH Companion community server.
- **GitHub** and **Discord** links use clearer button styling with icons.

### App

- **What's New** modal after updates when a release includes bundled in-app notes; shown once per version, with a link to full release notes on GitHub and optional actions (e.g. **Join Discord**).

## [1.12.0] - 2026-06-16

### Inventory

- **Inventory** tab summary matches **Live**: market value hero, estimated wallet total after Steam fees, and **instant sell** total capped by buy-order book depth (not full stack × top price).
- Table columns for sell price, buy order, and totals; pick visible columns; refresh Steam price per item.
- Location filters (Trading, Unknown, etc.) keep your selection and show an empty table when nothing matches.

### Market

- Gear Steam prices and buy orders use market variant **A** only (links, refresh, and bundled nameids).
- Buy order prices from the Steam order histogram even when there is no sell listing; formatted prices use thousand separators.
- After upgrading: use **Force refresh** on Inventory (or delete `userData/prices.<currency>.json`) once to clear stale cached B–E variant rows.

### App

- **Settings → Notifications**: global **Sound volume** slider (0–100%) for all notification sounds; **Preview sound** respects the current volume.
- Main window is **1100×720** (fixed width) to fit the inventory table and summary cards.

### Fixed

- Item catalog **market tradable** flags corrected so non-tradable gear is not priced on Steam Market.
- Diagnostic log messages use ASCII punctuation on Windows.

## [1.11.0] - 2026-06-16

### Live

- **Chest drops** on the **Live** tab: session totals and per-hour rates in stat tiles, per-type breakdown cards, and a scrollable drop history from Player.log (common and stage boss chests).
- Chest drop counts and history **persist across app restarts** mid-session.
- Heroes and XP history use matched column heights so long histories scroll inside the panel.

### Fixed

- **Player.log** status in the header no longer turns gold when only the save file is stale.

## [1.10.0] - 2026-06-14

### Market

- Settings and Market currency dropdown now include all live Steam wallet currencies (43 ISO codes).

## [1.9.0] - 2026-06-14

### App behavior

- Main window, Mini overlay, and Stage boss chest tracker remember their position (and size where resizable) across restarts, including on multi-monitor setups. If a monitor is unplugged, windows fall back to the primary display.
- **Stage boss chest tracker** appears on the Windows taskbar and in Alt+Tab, so you can bring it back when the main window is hidden to the tray. Use the header **−** button to minimize it without closing timers.

### Chests

- **Stage boss chest tracker** overlay: choose whether **On cooldown** or **Ready to mark** chests appear first (**Chests** tab → **Overlay display**). Preference is saved with your tracker settings.

### Fixed

- Launching TBH Companion again while it is already running (for example, hidden in the system tray) now focuses the existing window instead of starting a second background process.

## [1.8.1] - 2026-06-14

### Market

- Updated the bundled item catalog from game-extracted data (v1.00.11). **Dimensional Arcana** gear and other items with corrected Steam tradability are now included in **Refresh prices** instead of being skipped as non-tradable.

### Inventory

- Item names and tradability flags in **Inventory** match the current game catalog (5885 items).

## [1.8.0] - 2026-06-13

### Notifications

- **Notification sounds** in **Settings** now configure three alert types separately: **Chest drop** (Player.log or **Dropped**), **Chest ready** (cooldown finished), and **Hero level up** (level gain detected in your save).
- Each type has its own **Enabled** toggle, **Sound** picker, and **Preview sound** button.
- Added twelve new sounds (**Bright pop**, **Clear bell**, **Soft ding**, **Quick rise**, **Game blip**, **Arcade tone**, **Crystal chime**, **Happy ping**, **Magic spark**, **Level triumph**, **Treasure fanfare**, **Gentle alert**) in addition to the four from v1.7.0; pick **None (silent)** per type.
- Existing **Chest ready** sound choices migrate automatically from the old single picker.

### Market

- Steam price refresh shows shared progress on **Market** and **Inventory** while a fetch runs, with a **Stop** control.
- Refresh result messages are clearer when a run is queued, everything is already up to date, or inventory is not loaded yet.
- Price fetching is more reliable (timeouts and stale cache cleanup).

### App behavior

- On Windows, the taskbar shows **TBH Companion** with the app icon instead of a generic Electron label.

### Settings

- Diagnostic logs are consolidated into **app.log**; the path shown under **Advanced — logs and cached data** reflects the single file.

## [1.7.0] - 2026-06-11

### Notifications

- **Enable notifications** master toggle in **Settings** controls update toasts and chest-ready sounds.
- **Notify when an app update is available** shows a Windows notification when a newer release is found (requires the master toggle).
- Stage boss chest cooldown ready alerts are **sound only** (no OS toast). Per-level **Notify when ready** toggles on the **Chests** tab choose which routes alert you.
- Pick a chest-ready sound: **Soft chime**, **Double tap**, **Wood tick**, **Whisper ping**, or **None**.
- **Preview sound** in Settings plays your current selection so you can hear a variant before moving on.

### Settings

- Settings save automatically as you change them — no **Save** or **Reset** buttons.
- Changing **Rolling window (minutes)** still asks for confirmation because it resets the current session.

### Live stats

- Removed the **Hero-dric Cube XP** tracking option; live XP totals use hero XP only.

## [1.6.0] - 2026-06-11

### Chests

- **Stage boss chest tracker** on the Chests tab: pick levels to track, set per-level cooldowns and farm stages, and open the overlay from the tab or toolbar.
- Overlay shows ready/cooling timers; tap **Dropped** manually or rely on **Player.log** auto-detect when a stage boss chest drops.
- Player.log watch status appears in the save status bar when the log file is available.

### Settings

- Advanced clear-cache action renamed to **Reset stage boss chest tracker** (resets `box_timers.json`).

## [1.5.0] - 2026-06-11

### Pets

- New **Pets** tab tracks companion unlock progress from your save, total passive bonuses, kill targets, best farm stages (with expected kills per clear), and where each monster appears.

### Settings

- **Keep all windows on top** now applies to the main window, **Mini** overlay, and **Stage chest tracker**, and updates live when you change it in Settings.

### Inventory

- Fixed gear and materials from newer game saves showing as **Unknown #…** in **Inventory** instead of the correct item name.
- The **Price** column now shows **No active listings** when Steam has no listing or recent sales, instead of looking like a price is still loading.

## [1.4.1] - 2026-06-11

### About & updates

- Fixed in-app update downloads failing when a newer release was available from **About**.

## [1.4.0] - 2026-06-11

### Market

- Added **Indonesian Rupiah (IDR)** and **Vietnamese Dong (VND)** as Steam Market currency options in Settings and the Market tab.

## [1.3.0] - 2026-06-10

### About & updates

- New **About** tab (after Settings) shows the installed version and in-app updates from GitHub Releases.
- **GitHub** and **Release notes** links under the version open the project repo and the matching release on GitHub.
- Installed builds check for updates in the background about 30 seconds after startup; download and install only when you confirm in About.
- Updates install over your existing folder. Windows may still show an unsigned-app SmartScreen prompt — choose **More info** → **Run anyway**, same as the first install.

### App behavior

- Live session stats and rolling history resume after you restart the app, as long as your save file and tracking settings are unchanged.
- If the **Mini** overlay or **Stage chest tracker** was open when you quit, it reopens automatically on the next launch.

### Live

- Refreshed **Live** layout with stat cards and clearer hero and session history tables.
- Save status (watching, errors, session restored) appears in a bar under the tab strip instead of mixed into tab content.

### Settings

- Reworked **Settings** with clearer sections for save file, live stats, Steam Market, window & tray, and advanced cache controls.
- **Advanced — logs and cached data** lets you view the diagnostic log path, clear diagnostic logs, reset the session snapshot, or clear cached catalog, prices, and tracker data without touching `config.json`.
- Removed misleading save-password wording from Diagnostics.

### Mini overlay

- More uniform padding on the **Mini** overlay and **Stage chest tracker** windows.
- Expand and close controls sit flush with the window edges for easier clicking.

### Inventory

- **Inventory** table uses the same card styling as other tabs for a consistent look.

### Appearance

- Refreshed visual design across all tabs — shared buttons, cards, badges, and status colors (including **ideal** highlights on the chest tracker).
- Taskbar and window icons use transparent backgrounds so they look correct on the Windows taskbar.

## [1.2.0] - 2026-06-10

### Market

- Added **Philippine Peso (PHP)** and **Ukrainian Hryvnia (UAH)** as Steam Market currency options in Settings and the Market tab.

## [1.1.0] - 2026-06-10

### App behavior

- Closing the main window now sends the app to the **system tray** instead of quitting. Use **Quit** from the tray menu to exit fully.

### Live, Market & Settings

- Short intro copy on the Live, Market, and Settings tabs explains what each tab is for.
- Live tab shows clearer status while waiting for your save file (instead of a confusing “XP updated never” message).

### Mini overlay

- Smaller, more compact layout with rates on a single row (aligned with the Live tab strip).
- Expand and close controls are easier to tell apart.

### Chests

- Intro copy uses clearer **stage boss chests** terminology.

### Layout

- Tighter tab bar and more compact window chrome.
