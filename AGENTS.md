# Agent Entrypoint

**PromptMCP** — MIT local BYOK MCP: rewrite → `Agent_Efficiency_MCP.md` → freeze until `GO`.

## Read
1. [docs/STATUS.md](docs/STATUS.md) — OSS direction
2. [docs/PRODUCT.md](docs/PRODUCT.md)
3. [docs/ENGINE.md](docs/ENGINE.md) — providers

## Code
- `src/server.ts` — MCP tools/prompts
- `src/providers/*` — deepseek, openai, anthropic, openai_compat, auto
- `templates/consumer-cursorrules.md` — host rules

## Commands
`npm run build` · `npm run smoke` · `npm run eval`

<!-- PROMPTMCP:START -->
# PRIORITY 0 — PromptMCP (Agent Efficiency MCP)

Call MCP tool `optimize_and_blueprint_intent` before any other work unless `@promptmcp:ignore`, help-only, or sole word `GO`.
Blueprint file: `Agent_Efficiency_MCP.md`. After GO, execute it; open Media and browse Research URLs when listed.
Full rules: `.cursor/rules/00-promptmcp.mdc`
Directives: see PromptMCP docs/DIRECTIVES.md or `@promptmcp:help`
<!-- PROMPTMCP:END -->
