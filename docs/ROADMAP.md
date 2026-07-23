# Roadmap — High-value OSS polish (expanded)

## Direction
AGPL-3.0-only open-source local MCP with BYOK (+ commercial dual-license). Blueprint artifact: **`Agent_Efficiency_MCP.md`**.

## Done
- [x] Local MCP MVP (freeze + blueprint + validation)
- [x] Consumer rules + `/optimize` fallback
- [x] Multi-provider BYOK + local/LAN
- [x] Composable `@promptmcp:` directives
- [x] Eval + smoke + unit tests + CI
- [x] Docs SSoT; AGPL-3.0 LICENSE; commercial contact; `docs/DIRECTIVES.md`
- [x] Provider retries, SSRF guards, path confinement, doctor CLI, npx launch
- [x] Media vision + blueprint history

---

## Eight improvements (with product notes)

### 1. Gate reliability + merge-safe rules
- Install **adds** PromptMCP rules; never deletes the user’s existing rules.
- Ship as high-priority `.cursor/rules/00-promptmcp.mdc` (sorts first) with PRIORITY 0 wording.
- If the project only has `.cursorrules` / `AGENTS.md`, **upsert** a marked block (`<!-- PROMPTMCP:START -->` … `<!-- PROMPTMCP:END -->`) without wiping the rest.
- User may resolve conflicts manually; our wording stays “call this tool first.”

### 2. Richer workspace context (critical)
Maximize signal for the rewrite API:
- Deeper tree walk (capped), language/stack hints, README/AGENTS snippets
- package.json scripts + deps, recent git commits + changed files
- **Forced-file contents** (capped snippets) so the rewriter sees real code
- Pass all of this in the user payload; keep token budgets hard-capped

### 3. Blueprint quality loop
- Expand eval fixtures (forced paths, long/short, include)
- Score keeping forced citations; document recommended model presets
- Smoke covers directive + context richness checks

### 4. Install UX (`npx promptmcp init`)
Traditional CLI that:
1. Resolves install path to this package’s `dist/server.js`
2. Registers MCP on **Cursor, VS Code, Windsurf, Claude Desktop, Claude Code** (merge, don’t clobber other servers)
3. Merges consumer rules into the **target project** (cwd or `--project`)
4. Creates **`Agent_Efficiency_MCP.md`** near project root with a starter stub
5. Prints the **absolute path** of that file (and every config/rules path touched)

### 5. Post-`GO` contract
Freeze payload includes an execution checklist when Media / Research sections exist so hosts open images and browse URLs.

### 6. Directive discoverability
- `@promptmcp:help` + docs/DIRECTIVES.md
- MCP tool `list_promptmcp_directives` for hosts that browse tools

### 7. Safer defaults
- Factual metrics header only (no “minutes saved” hallucinations)
- Optional `PROMPT_MCP_DRY_RUN=1` — rewrite + return path, skip overwrite
- Cost/model echoed in freeze line (provider + model already)

### 8. Later (not blocking)
- Media vision during rewrite, live web fetch for `search`, blueprint history, multi-root

---

## Near-term checklist
- [x] Rich workspace context + forced-file snippets
- [x] `agent-efficiency-mcp init` multi-host merge + PRIORITY 0 rules + blueprint stub
- [x] Rename HUD → `Agent_Efficiency_MCP.md`; factual metrics header
- [x] Post-GO media/research checklist; `list_promptmcp_directives`; dry-run
- [x] Provider-tuned rewrite dialects + validation repair pass
- [x] Multi-host rule/guidance templates (Cursor, Claude, VS Code, Windsurf)
- [x] Eval R5 forced-path retention + ignore handling
- [x] Media vision + safer URL enrich + history + doctor + retries
- [ ] Public GitHub polish + GIF of GO loop
- [ ] Publish npm package for true one-liner `npx agent-efficiency-mcp init`
- [ ] Community examples per IDE
## Explicitly cancelled
- Stripe / SaaS metering / Azure multi-tenant rewriter business

## Soft / known limits
- Host models may skip the MCP; rules + `/optimize` only
- Cannot protocol-force slot-one tool calls
