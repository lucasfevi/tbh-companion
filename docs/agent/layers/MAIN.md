# Main and preload layer

Electron **main** owns file I/O, decryption, network, windows, and IPC. **Preload** is a thin `contextBridge` only. **core/** stays framework-free — parse and compute there; read bytes and log in main (full core/ conventions: [CORE.md](CORE.md)).

Read `docs/ARCHITECTURE.md` and `docs/DIAGNOSTIC_LOGGING.md` when adding services or handlers.

## Hard rules

1. **Save file is read-only.** Never write to `SaveFile_Live.es3` or game paths. Companion only reads and watches.
2. **No Node in renderer.** Renderer uses `window.tbh` from preload — no `fs`, `electron`, or raw `ipcRenderer` in `app/src/renderer/`.
3. **IPC channels live in one place.** Add names to `app/shared/ipc.ts`, register in `main/ipc/registerIpc.ts`, expose in preload, test in `test/ipc/channels.test.ts`.
4. **core/ does not log.** Return errors/results from core; log in main with `createLogger('module')` from `app/src/main/log.ts` (see [CORE.md](CORE.md) for the full purity boundary).
5. **Renderer errors:** `reportIpcError(err, 'source')` or `window.tbh.logRendererError()` — no file writes in renderer.
6. **No secrets in logs.** Redaction exists but avoid logging tokens, passwords, or full save JSON.
7. **Bundle paths:** preload/renderer load via `app/src/main/paths.ts` (`../preload`, `../renderer` from `out/main/`). After path changes, `pnpm qa` must pass bundle guards.

## IPC checklist (new or changed channel)

- [ ] Channel constant in `shared/ipc.ts`
- [ ] Handler in `main/ipc/` (auth/validate inside handler — treat like a public API)
- [ ] Preload method on `window.tbh` (typed in preload)
- [ ] `test/ipc/channels.test.ts` updated
- [ ] Lifecycle logged once at start; failures at `warn`/`error` (not per-tick)

## CSP & network

Production CSP is set for the renderer (`script-src 'self'`, Steam hosts on `connect-src`, `style-src 'unsafe-inline'`). Do not widen CSP for convenience. Steam Market fetches run in **main** only.

See `docs/DECISIONS.md` (CSP, IPC-over-HTTP rejection).

## Windows & I/O

- Expand env vars (`%USERPROFILE%`, `%APPDATA%`) — never hard-code user home.
- Save reads can fail transiently (sharing violation, mid-write ciphertext). Retry briefly; treat as transient where existing watchers do.
- PowerShell: chain with `;` not `&&`; quote paths with spaces — see [../WINDOWS.md](../WINDOWS.md).

## Config & state

- User settings: `config.json` via existing IPC patch flow — no duplicate config types (`AppConfig` in `shared/types.ts`).
- New globals in `main/index.ts` are discouraged — use `app/appState.ts` or a service module.
- New bundled JSON under `data/`: see [DATA.md](DATA.md) for registration (`REQUIRED_BUNDLED_DATA_FILES`) and loading conventions.

## Security

- Run `pnpm audit` awareness on dependency changes; CI runs `pnpm audit --audit-level high`.
- Preload exposes the **minimum** surface — no generic `invoke(channel, ...)` escape hatches.
- Never commit personal save data — see [../GIT.md](../GIT.md).

## Examples

### Example 1: New IPC handler

User: "Add IPC to refresh game data."

Actions: `shared/ipc.ts` → `registerIpc.ts` → preload → channel test → log start/fail in main → no renderer `fs`.

### Example 2: New main service

User: "Watch player log file."

Actions: Service in `main/`, parse in `core/`, `createLogger('playerLog')`, wire from `appState.ts`, document in `docs/` if behavior is user-visible.
