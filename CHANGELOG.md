# Changelog

User-facing changes for TBH Companion releases. Update the **[Unreleased]** section as features merge; move it to a version heading before tagging (Release prepare).

## [Unreleased]

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
