# Changelog

Newest first.

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
