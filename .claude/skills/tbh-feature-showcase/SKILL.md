---
name: tbh-feature-showcase
description: Capture screenshots (and optionally a short video) of a new TBH Companion feature and compose a player-facing announcement. Run after a feature is implemented and QA passes. Produces screenshots saved under docs/showcase/ and a Discord-ready announcement draft. Pairs with docs/agent/CHANGELOG-RELEASE.md for release notes. Not for internal docs, speculative/unreleased work, or reproducing screenshots that already exist in docs/.
license: CC-BY-4.0
metadata:
  author: tbh-project
  version: 1.0.0
---

# TBH Companion — Feature Showcase

Capture the feature running in the app and draft a player-facing announcement, so TBH players know what's new and how it helps them.

## Before you start

- Feature is implemented, QA passed (`pnpm qa`), and the branch is either merged or ready for demonstration.
- The dev server can be launched (`cd app; pnpm dev`) or the user already has the app open.
- If the feature requires live save data (inventory values, hero rates, XP history), the user should have TBH running so the companion can read the save file.

## Workflow

```
Progress:
- [ ] Step 0: Identify the feature and its UI surface
- [ ] Step 1: Draft the player-facing description
- [ ] Step 2: Plan screenshot shots
- [ ] Step 3: Launch and navigate the app
- [ ] Step 4: Capture screenshots
- [ ] Step 5: Compose the announcement
- [ ] Step 6: Save outputs and report
```

### Step 0 — Identify the feature

Read context from the most specific source available:

1. `git diff main...HEAD --stat` — see what changed
2. `CHANGELOG.md` `[Unreleased]` section — user-facing bullets already drafted
3. The user's description in the current conversation

Determine:

| Field | Answer |
|-------|--------|
| **Tab(s)** | Live, Inventory, Market, Chests, Settings, About, Lookup, Mini overlay, or box tracker |
| **New element** | New filter, column, card, badge, popover, overlay, or data |
| **Player benefit** | What does this let a TBH player do or know that they could not before? |
| **Data dependency** | `none` (visible without a save) · `live save` (requires TBH running) · `prices` (requires Steam price cache) |

### Step 1 — Draft player-facing description

Before touching the app, draft in plain text:

```
Feature name (1 short line): ...
Player benefit (1 sentence, no dev jargon): ...
Tab / location: ...
Data needed: none | live save | prices
```

**Voice rules:**

- Address the player directly: "you can now see…", "filter your inventory by…"
- Use game terms players recognize: heroes, chests, XP, gold, grades, stages, pets, stash, equipped
- Never say "fixed bug", "implemented", "added feature" — say what the player experiences
- Avoid "companion app", "installed on your system" — name the tab instead: "in **Inventory**", "on the **Live** tab"
- If the changelog already has a good bullet, base the description on it but make it warmer and more direct

### Step 2 — Plan screenshot shots

Aim for **2–4 screenshots** — enough to show the feature clearly without being repetitive.

| Shot type | When to use |
|-----------|-------------|
| **Overview** | Full tab showing the feature in context |
| **Detail** | Focused on the new control, badge, or data point |
| **Interaction** | Popover open, filter applied, dropdown visible, badge state |
| **Before / after** | Only when contrast with the previous behavior clarifies the change |

For **overlay features** (Mini, box tracker): capture the overlay window on its own — it's small and self-contained.

Name shots in sequence: `01-overview.png`, `02-filter-open.png`, `03-detail.png`.

**Before finalising the plan, ask the user two questions for any Detail or Interaction shot:**

1. **Which specific item?** — If the shot involves opening an item detail panel, searching for an item, or browsing a specific entry, ask: *"Which item should I open for this shot?"* Do not pick one yourself; the user knows which item will look best or be most representative.
2. **Which component to focus?** — If the detail panel or tab has scrollable content (e.g. stats section, "Where to find", "Offering Loot" table, crafting recipes), ask: *"Which section of the panel should be in view / scrolled to for this shot?"* Then scroll to that section before capturing.

Skip these questions only if the shot is a pure overview with no specific item or panel state required.

### Step 3 — Launch and navigate

**Load all computer-use tools** via ToolSearch before this step:

```
ToolSearch: query "computer-use", max_results 30
```

**Request access** to the Electron window:

```
request_access: ["TBH Companion"]
```

If the app is not open, launch it (PowerShell):

```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd app; pnpm dev"
```

Wait ~10 seconds, then take an initial `screenshot` to confirm the Companion window is visible.

**Navigate** by clicking the correct tab in AppTabBar. For a specific UI state (popover open, filter set, badge visible), use `left_click` on the relevant controls. Verify each state with `screenshot` before capturing.

**Data dependency notes:**

- `live save` feature and TBH is not running → ask the user to open TBH; the companion reads the save file automatically within ~30 seconds of TBH starting.
- `prices` feature and no prices loaded → open the Market tab and trigger a price refresh, or use Inventory's per-item refresh buttons.
- Features that show a useful state even without data (placeholder UI, new controls, empty-state banners) — capture that state; it still demonstrates the new element.

### Step 4 — Capture screenshots

Create the output directory (PowerShell):

```powershell
New-Item -ItemType Directory -Force -Path "docs\showcase\<YYYY-MM-DD>-<feature-slug>"
```

For **each planned shot**:

1. Use computer-use to navigate to the right state. If the shot requires a specific item detail panel or a specific section to be visible, scroll to that section before capturing.
2. `screenshot` — verify the Companion window is in frame and the feature is clearly visible.
3. Bring the window to the foreground if needed: `left_click` the title bar, then re-verify.
4. Save **only the Companion window** using `PrintWindow` with `PW_RENDERFULLCONTENT` — the same API the Windows Snipping Tool "Window" mode uses. This renders the window directly into a bitmap regardless of what is behind it, so the desktop never bleeds in:

```powershell
Add-Type -AssemblyName System.Drawing
Add-Type @"
  using System; using System.Drawing; using System.Runtime.InteropServices;
  public class PW {
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
    [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, int flags);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  }
"@
$hwnd = (Get-Process -Name electron | Where-Object { $_.MainWindowTitle -eq "TBH Companion" } | Select-Object -First 1).MainWindowHandle
$r = New-Object PW+RECT; [PW]::GetWindowRect($hwnd, [ref]$r) | Out-Null
$w = $r.Right - $r.Left; $h = $r.Bottom - $r.Top
$bmp = New-Object System.Drawing.Bitmap($w, $h)
$g   = [System.Drawing.Graphics]::FromImage($bmp)
$hdc = $g.GetHdc()
[PW]::PrintWindow($hwnd, $hdc, 2) | Out-Null   # 2 = PW_RENDERFULLCONTENT
$g.ReleaseHdc($hdc); $g.Dispose()
$bmp.Save("$env:TEMP\tbh_shot.png", [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
Copy-Item "$env:TEMP\tbh_shot.png" "docs\showcase\<folder>\<shot-name>.png" -Force
```

Always save to `$env:TEMP` first then `Copy-Item` to the destination — paths with spaces cause GDI+ to fail on `Save` directly.

If the capture is blank or shows the wrong content, the Electron process may not yet have finished rendering. Add `Start-Sleep -Seconds 1` before `GetHdc` and retry.

**Privacy check after each shot:** scan the saved image with a `screenshot` review. Check for:
- Real player name visible in the UI
- Item values the user would not want public
- Personal save path in any visible dialog

If anything is sensitive, ask the user whether to proceed or adjust the UI state before retaking.

### Step 5 — Compose the announcement

After all shots are confirmed, write two texts.

#### Discord announcement

```markdown
## <Feature name> — TBH Companion

<1–2 sentences: what's new and why it matters to the player. Game-first tone.>

**What you get:**
- <Bullet 1>
- <Bullet 2>
- <Bullet 3 if needed>

📸 *Screenshots attached*

→ [Download the latest release on GitHub](<release URL placeholder>)
```

Rules for the Discord body:
- No version numbers in the body unless the user asks for them
- No "we implemented" or "the app now" — use "you can now" or name the feature directly
- Bullets must be parallel and concrete — each one is something the player can do or see
- If the feature surfaces a tooltip or label from the app, quote it verbatim in `**bold**`

#### Short version

One sentence for social sharing or a brief GitHub release summary line:

```
<Feature name>: <player benefit in one sentence>. Find it in <Tab name> — TBH Companion.
```

### Step 6 — Save outputs and report

Write the text files:

```powershell
Set-Content "docs\showcase\<folder>\announcement-discord.md"  -Encoding UTF8 -Value @'
<discord announcement text>
'@

Set-Content "docs\showcase\<folder>\announcement-short.md" -Encoding UTF8 -Value @'
<short text>
'@
```

Final output directory structure:

```
docs/showcase/<YYYY-MM-DD>-<feature-slug>/
  01-overview.png
  02-detail.png          (additional shots)
  announcement-discord.md
  announcement-short.md
```

Report to the user:
- Files saved at `docs/showcase/<folder>/`
- Discord announcement preview in chat (paste the markdown block)
- Data dependency note if live save or price data was needed
- Video suggestion if the feature has animation or interaction worth recording (see below)

## Video / GIF (optional)

If the feature has meaningful interaction — a popover opening, a filter being applied, live rates updating — suggest a short recording. A GIF renders inline in Discord without a click; a short MP4 works for GitHub.

**Windows Game Bar** (built-in):
1. Focus the TBH Companion window.
2. `Win + G` → click **Record** (or `Win + Alt + R` to toggle without opening the overlay).
3. Saved automatically to `%USERPROFILE%\Videos\Captures\`.
4. Move to `docs/showcase/<folder>/demo.mp4`.

**ScreenToGif** (for GIFs — install separately):
1. Select the Companion window region.
2. Record 3–8 seconds of the interaction.
3. Export as GIF, move to `docs/showcase/<folder>/demo.gif`.

Keep GIFs under 5 MB for inline Discord rendering. If the recording is longer, trim to the key interaction only.

## Output checklist

- [ ] Feature correctly identified from diff or changelog
- [ ] Player description is benefit-first with no dev jargon
- [ ] 2–4 screenshots, each showing the feature clearly
- [ ] No sensitive player data visible in any shot
- [ ] Discord announcement uses player-first voice
- [ ] All files written to `docs/showcase/<folder>/`
- [ ] Video suggestion made if the feature is interactive

## Tone examples

**Too dev-y:**
> "Added `unequippedOnly` filter to inventory query pipeline, replacing `inUseOnly`. Fixes count mismatch."

**Good:**
> "**Unequipped only** — a new Inventory filter that hides items where every copy is equipped, so you can focus on what's still sitting in your stash."

---

**Too dev-y:**
> "Implemented inventory fill prediction based on Player.log parse results."

**Good:**
> "The **Live** tab now shows when your inventory will fill up, based on your current drop rates. You'll see it before your chests start stacking up."

---

**Too dev-y:**
> "Refactored Steam buy-order walk to iterate the full order book."

**Good:**
> "**Instant total** now checks the full buy-order book level by level — large stacks get an accurate proceeds estimate, not just top-price × quantity."

## Troubleshooting

### App window not visible after launch

Check that `pnpm dev` started cleanly (no TypeScript or port errors in the terminal). The Electron window opens in ~5–10 seconds. If it stays blank, run `pnpm qa:dev` to confirm a non-blank window opens.

### Feature not visible without save data

Open TBH (the game), then switch back to the Companion. The companion re-reads the save file automatically. If it still does not update, check the save status bar at the top of the Companion window.

### Companion window not found / capture is blank

`Get-Process -Name electron | Where-Object { $_.MainWindowTitle -eq "TBH Companion" }` relies on the process having a named main window. If the dev build hasn't finished loading the renderer yet, the title is empty — wait a few more seconds and retry.

If `PrintWindow` returns a blank or black bitmap, the Electron GPU process may not have responded in time. Add `Start-Sleep -Seconds 1` before `GetHdc` and try again. Flag `2` (`PW_RENDERFULLCONTENT`) is required for Electron/GPU-composited windows; flag `0` will produce a blank result.

### Screenshot file is blank or black after saving

GDI CopyFromScreen can race with GPU-accelerated compositing. Add `Start-Sleep -Milliseconds 300` immediately before the CopyFromScreen call and retry.

### Feature involves the Mini overlay

The Mini overlay is a separate small window (frameless, ~280×94). Use computer-use to click the **Mini** button in AppToolbar, wait for it to appear, then take a screenshot. The overlay appears on top of the desktop — no need to resize.
