/** Log IPC/renderer errors in dev; swallow in production builds. */
export function reportIpcError(err: unknown): void {
  if (import.meta.env.DEV) {
    console.error("[tbh]", err);
  }
}
