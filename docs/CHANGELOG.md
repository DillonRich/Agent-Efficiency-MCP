# Changelog

Newest first.

## 2026-07-31 — Repo hygiene
- Removed archived/internal docs (Azure lab, market sizing, publish/demo checklists, eval trend dumps) and unused `site/` landing
- Docs index rebuilt around user install + design + quality; trends write under gitignored `fixtures/eval/results/`

## 2026-07-31 — 1.4.8 Launch pack
- `doctor` treats MCP `mcp.json` env keys as valid credentials (no false FAIL for npx)
- `init` defaults to **project** Cursor MCP only; `--also-global` opt-in for `~/.cursor/mcp.json`
- Flash-class models default **thinking off** (override with `--effort` / `--thinking on`)
- Docs: one-page install, STATUS refresh, VS Code smoke notes, dogfood n≥20 guidance

## 2026-07-30 — 1.4.7 HQ-prompt polish
- Stop treating English `a/b` phrases (`start/end`, `P0/P1`, `Rust/Tauri`) as forced paths
- Depth scaling in quality rubric (short asks stay compact; long/novel can expand)
- Skip generic build/test verification injection on analysis-only blueprints
- Harder usage parsing for thinking-mode token details

## 2026-07-30 — 1.4.6 Sync configure keys into global Cursor MCP
- `configure` patches `~/.cursor/mcp.json` when our server is already registered there (fixes dual-entry empty-env failures)
- Clearer “no provider” error: MCP env / configure, not package `.env` for npx consumers
- Doctor FAIL without process env marked as expected for npx path
- Docs: dual mcp.json edit warning + prefer `configure`; optional Code Graph note; legacy `.agent_intent.md` unused
- PROMPTMCP_META: `prompt_tokens` / `completion_tokens` / `est_usd` when the provider returns usage; directive flags include file/scope/search

## 2026-07-24 — 1.4.5 Init copy polish
- Next-steps note smart provider/model name mapping
- Step 4: “Send a prompt” (drop “task”)

## 2026-07-24 — 1.4.4 Cursor-only default + durable npx launch
- `--hosts auto` is **Cursor only** (no `.vscode` dual-write); use `--hosts all` for multi-IDE
- Removes leftover `.vscode/mcp.json` that only contained our server
- Host tip markdown filtered to the selected IDE family
- `npx … init` auto-selects `--launch npx` so MCP does not pin a disposable npm-cache path
- Effort help text lists none|low|medium|high|max

## 2026-07-24 — 1.4.3 Configure UX + host scoping + real effort knobs
- Init next-steps use generic `"<PROVIDER>"` / `"<YOUR_KEY>"` / `"<MODEL>"` (project path stays dynamic)
- `--hosts auto|cursor|vscode|all` — default auto writes Cursor only (VS Code only if `.vscode/` exists)
- Flexible provider/model aliases (`Deep Seek`, `flash high`, `pro:max`, GPT nicknames)
- `--effort` / `--thinking` / `--max-tokens` / `--temperature` → MCP env → actual rewrite API body
- Auto-append `.cursor/mcp.json` (and `.vscode/mcp.json`) to project `.gitignore` on init/configure

## 2026-07-24 — 1.4.2 Env security + clean uninstall
- Confirmed: consumers never get a project `.env` from us; keys live only in the MCP server `env` block (`mcp.json`)
- `configure` defaults to **project** MCP configs; `--also-global` opt-in for `~/.cursor/mcp.json`
- `uninstall --purge` deletes blueprint `.md`(s), the entire `.promptmcp/` tree (hosts + history), empty mcp.json husks, and empty `.cursor/rules`
- Docs/doctor clarify we never append to the app’s `.env`
- Note: npm `@latest` must be ≥1.4.2 for `--purge` (1.4.0 silently ignored the flag)

## 2026-07-22 — 1.4.0 Professional hardening
- AGPL-3.0-only + commercial dual-license docs consistency
- Provider HTTP retries / redacted errors; SSRF guards; workspace path confinement
- Media vision for OpenAI / Anthropic / Gemini / xAI / local / compat
- Blueprint history (`.promptmcp/history/`); `doctor` + `version` + `uninstall` CLI; `--launch npx|node`
- Archetype strategies + R1–R10 scorecard; adaptive quality repair; context budgets (lean/rich)
- `@promptmcp:scope[...]`; blueprint delta vs previous HUD; mock provider for CI eval
- Auth circuit breaker; flake-check; eval-trend; dogfood gate template
- Unit tests + GitHub Actions CI; root SECURITY.md; issue/PR templates
- Package rename story: `agent-efficiency-mcp`

## 2026-07-22 — Production hardening
- HTTP timeouts; optional URL title/snippet enrich for `@promptmcp:search`
- Media/search always force-written with abs paths + REQUIRED-after-GO + host obligations
- SECURITY / PRIVACY / TRUST / PUBLISH / DEMO docs; npm publish metadata
- Compliance checklist; npm name claim path

## 2026-07-22 — Cross-model quality + host gate success
- Provider dialect system prompts + quality rubric + validation repair retry
- Stronger PRIORITY 0 Cursor rules; host tips for Claude / VS Code / Windsurf / Cursor
- Eval R5 (forced paths); ignore cases scored as expected skips
- Docs: QUALITY.md, HOSTS.md

## 2026-07-22 — High-value polish (init, rich context, rename, metrics)
- Blueprint: `Agent_Efficiency_MCP.md`; factual `PROMPTMCP_META` (no minutes-saved)
- Rich context: tree walk, docs, git log, forced-file snippets
- CLI `promptmcp init` — multi-host MCP merge + PRIORITY 0 rules + blueprint stub
- Tool `list_promptmcp_directives`; post-GO media/research checklist; `PROMPT_MCP_DRY_RUN`

## 2026-07-22 — Composable @promptmcp: directives
- Parser + engine modifiers: ignore, include, file, media, search, long, short, test, tone, diff, strict, help
- Aliases: `@mcp:` / `@ourmcp:`
- Forced path injection + Original Prompt / Media / Research sections

## 2026-07-22 — Gemini, Grok/xAI, and local/LAN LLMs
- Providers: `gemini`, `xai` (alias `grok`), `local` (Ollama/LM Studio/vLLM/LAN)
- `openai_compat` for OpenRouter and other OpenAI-compatible clouds
- Docs: local mini-PC routing via `LOCAL_LLM_BASE`

## 2026-07-22 — Explicit model selection (BYOK)
- `REWRITE_MODEL` + per-provider `*_MODEL` env vars
- Friendly aliases (`sonnet 4`, `opus 4.8`, `flash`, `mini`, …) via `src/providers/model.ts`

## 2026-07-22 — Pivot to OSS local BYOK (later AGPL)
- Cancelled paid SaaS / Stripe / hosted-rewriter business path
- Providers: `auto` | `deepseek` | `openai` | `anthropic` | `openai_compat`
- README, PRODUCT, LICENSE, CONTRIBUTING oriented to GitHub install
- Commercial infra marked archived

## 2026-07-22 — Infra roadmap scaffolds + provider abstraction
- Initial `deepseek` / `openai_compat` providers, eval, gateway stub (gateway now non-primary)

## 2026-07-21 — Harder gate for follow-ups / planning skips
- Consumer PRIORITY 0 rules; Composer skip documented as host limit

## 2026-07-21 — Functional MCP MVP
- Local stdio MCP, DeepSeek rewrite, validation, smoke
