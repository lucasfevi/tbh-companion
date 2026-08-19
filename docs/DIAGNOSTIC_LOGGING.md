# Diagnostic logging

Support-oriented logs for debugging user issues. **Not** the same as XP history CSV (`logs/xp_history.csv`), which is optional user export data.

## Log file

| Item | Value |
|------|--------|
| Path | `%APPDATA%/tbh-companion/logs/app.log` (Windows) |
| Rotation | 1 MB max; previous file becomes `app.old.log` |
| Clear | Settings → **Diagnostics** → **Clear diagnostic logs** (also removes legacy `main.log` / `main.old.log`) |

Logging initializes at startup via `logInit.ts` (imported before other main modules) so
`electron-log` does not write to its default `main.log`. Ask users to send `app.log`
(and `app.old.log` if present) when investigating bugs.

## Where to log

| Layer | Rule |
|-------|------|
| **main** (`app/src/main/`) | Use `createLogger('moduleName')` from `app/src/main/log.ts` |
| **core** (`app/src/core/`) | **Do not log.** Return errors/results; log in main after handling |
| **renderer** (`app/src/renderer/`) | **Do not write files.** Use `reportIpcError(err, 'source')` or `window.tbh.logRendererError()` for failures worth persisting |

Initialize once at startup via `app/src/main/logInit.ts` (imported first from `index.ts`, after `appIdentity.ts` sets the Windows AppUserModelId).

## API

```typescript
import { createLogger } from "../log";

const log = createLogger("myFeature");

log.info("Watcher started");
log.warn("Recoverable issue");
log.error("Hard failure");
log.debug("Verbose detail"); // unpacked/dev builds only
```

Line format (written by `electron-log`):

```
[2026-06-10 15:04:05.123] [info] myFeature Message text
```

Repeated identical `warn`/`error` lines are throttled (5 minutes) to avoid flooding when the save poll fails every few seconds.

## What to log on a new feature

Log **lifecycle and outcomes**, not high-frequency success:

- Feature/service start or enable (once)
- User-initiated IPC actions (handler called → ok/fail summary)
- Recoverable failures → `warn`
- Hard failures / parse errors → `error`

Do **not** log:

- Every save poll or unchanged mtime check
- 1 Hz stats broadcasts
- Full save JSON, inventory rows, or per-item market progress
- `es3Password` or other secrets (sanitizer redacts common patterns; still avoid logging secrets)

## Examples

**Main — service catch block (good):**

```typescript
const log = createLogger("inventory");

try {
  // ...
} catch (err) {
  log.error(`resolveAndPushInventory failed: ${String(err)}`);
}
```

**Main — hot path (bad):**

```typescript
// Inside SaveWatcher.tick() on every successful read:
log.info(`Read save OK`); // floods disk during active play
```

**Renderer — IPC failure (good):**

```typescript
} catch (err) {
  reportIpcError(err, "market-refresh");
  setMessage("Refresh failed.");
}
```

## Tests

Pure helpers in `log.ts` (`sanitizeLogMessage`, `evaluateLogThrottle`, `clearDiagnosticLogs`, paths) are covered in `app/test/main/diagnosticLog.test.ts`. Add cases there if new log messages involve sensitive fields.

## Related

- Implementation: `app/src/main/log.ts`
- Settings UI: `app/src/renderer/tabs/Settings.tsx` (Diagnostics section)
- ADR: `docs/DECISIONS.md` (diagnostic logging entry)
