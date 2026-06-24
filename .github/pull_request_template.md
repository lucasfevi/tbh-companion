## Summary

<!-- What does this PR do? One or two sentences for reviewers. -->

## Contributor checklist

- [ ] I ran `cd app; pnpm qa` locally (or CI is green on this PR)
- [ ] No save files, decrypted dumps, or personal `sample/` data in this PR
- [ ] If I added or changed IPC: updated `shared/ipc.ts`, preload, main handler, and `test/ipc/channels.test.ts`
- [ ] If I changed `app/src/core/`: added or updated Vitest tests
- [ ] If I changed renderer UI: matches Inventory-style patterns (`docs/STYLING.md`, `docs/agent/layers/UX.md`)
- [ ] Removed temporary `probe-*` / `spike-*` scripts unless this PR documents keeping them
- [ ] If users will notice the change: noted for `CHANGELOG.md` `[Unreleased]` (maintainer may edit on merge)

## Test plan

<!-- How did you verify? e.g. qa pass, dev smoke tabs visible, specific tab tested -->

<!-- Agents on Windows: write this section to a file and use gh pr create --body-file (see docs/agent/PULL-REQUEST.md). -->
