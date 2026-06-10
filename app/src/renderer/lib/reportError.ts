/** Log IPC/renderer errors in dev console; persist via main in all builds. */
export function reportIpcError(err: unknown, source = "ipc"): void {
  if (import.meta.env.DEV) {
    console.error("[tbh]", err);
  }

  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  void window.tbh?.logRendererError?.({ source, message, stack }).catch(() => {
    // Preload may be unavailable during early boot.
  });
}
