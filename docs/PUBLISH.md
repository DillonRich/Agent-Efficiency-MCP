# Publish (npm)

**Goal:** Publish the full package as `agent-efficiency-mcp` (beyond the `0.0.1` name-claim placeholder).

## End-user install (after full publish)

```bash
npx agent-efficiency-mcp@latest init --project .
# or
npm i -g agent-efficiency-mcp
agent-efficiency-mcp init
```

Alias `promptmcp` remains available for short CLI typing.

## Checklist before publish
1. `npm run build && npm run smoke`
2. Confirm `.env` / keys are **not** in the tarball (`npm pack --dry-run`)
3. `LICENSE` is AGPL-3.0; README + `docs/COMMERCIAL.md` link commercial contact
4. Bump `version` in `package.json` (e.g. `1.3.0`)
5. `npm publish` (account with 2FA / OTP)

| Command | Why |
|---------|-----|
| `npx agent-efficiency-mcp@latest init` | One-liner professionals expect |

Do **not** publish until the GitHub repo is ready and you intentionally release.
