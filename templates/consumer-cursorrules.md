# Consumer IDE Guardrails

`npx agent-efficiency-mcp init` (alias: `promptmcp init`) **merges** these rules into your project without deleting existing rules:

1. Writes/updates `.cursor/rules/00-promptmcp.mdc` (PRIORITY 0 — sorts first)
2. Upserts a marked block into `.cursorrules` / `AGENTS.md` if those files already exist
3. Copies host tips into `.promptmcp/hosts/`

Source of truth for the rule body: [`00-promptmcp.mdc`](./00-promptmcp.mdc)

**Hard truth:** Cursor cannot mechanically force tool calls. Rules maximize compliance; `@promptmcp:ignore` is the intentional bypass.

**Recovery if skipped:** `/optimize` · `call PromptMCP` · `run the efficiency engine` · `gate this prompt` · lead with `@promptmcp:include`.

Blueprint file: **`Agent_Efficiency_MCP.md`** (project root by default; you may move it — set `PROMPT_MCP_BLUEPRINT` if renamed).
