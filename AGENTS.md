# Agent Entrypoint

**PromptMCP** — AGPL-3.0-only local BYOK MCP: rewrite → `Agent_Efficiency_MCP.md` → freeze until `GO`.

## Read
1. [docs/STATUS.md](docs/STATUS.md) — OSS direction
2. [docs/PRODUCT.md](docs/PRODUCT.md)
3. [docs/ENGINE.md](docs/ENGINE.md) — providers

## Code
- `src/server.ts` — MCP tools/prompts
- `src/providers/*` — deepseek, openai, anthropic, gemini, xai, local, openai_compat, mock, auto
- `templates/00-promptmcp.mdc` — PRIORITY 0 host rules

## Commands
`npm run build` · `npm test` · `npm run smoke` · `npm run auto-dogfood` · `npm run eval:mock`

<!-- PROMPTMCP:START -->
# PRIORITY 0 — PromptMCP (Agent Efficiency MCP)

ZERO TOKENS BEFORE TOOL: first action = call `optimize_and_blueprint_intent` with verbatim user text + absolute workspace_root.
No greeting/plan/other tools first. Then freeze until GO. On GO, execute `Agent_Efficiency_MCP.md` (open Media / Research when listed).
Exceptions only: `@promptmcp:ignore` (answer normally); sole word `GO` (execute blueprint); sole `@promptmcp:help` (cheat-sheet, no freeze).
Recovery if you already wrote prose/tools without gating: STOP → call the tool now. Phrases: `/optimize`, “run the efficiency engine”, “call PromptMCP”, “gate this prompt”.
Self-check before any non-freeze reply: did I call `optimize_and_blueprint_intent` this turn (or hit an exception)? If no → call it.
Tip: lead messy prompts with `@promptmcp:include`.
Full Cursor rules: `.cursor/rules/00-promptmcp.mdc`
Host tips: `.promptmcp/hosts/` (claude, vscode-copilot, windsurf, cursor)
<!-- PROMPTMCP:END -->
