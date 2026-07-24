# PromptMCP — VS Code / GitHub Copilot host guidance

Use with `.vscode/mcp.json` from `promptmcp init` (root key `servers`).

## Copilot Chat / Agent
1. Ensure MCP server `agent-efficiency-engine` is enabled.
2. Add this to workspace instructions / `.github/copilot-instructions.md` (merge; do not delete other content):

```markdown
<!-- PROMPTMCP:START -->
PRIORITY 0 — ZERO TOKENS BEFORE TOOL: first action = call optimize_and_blueprint_intent
(raw_prompt=verbatim user message, workspace_root=absolute workspace path).
No greeting/plan first. Then freeze until GO. Read Agent_Efficiency_MCP.md on GO.
Bypass only with @promptmcp:ignore. Help: @promptmcp:help. Tip: lead with @promptmcp:include.
<!-- PROMPTMCP:END -->
```

## Copilot-specific tips
- Copilot often answers from context without tools — the instruction block above must stay PRIORITY 0.
- Prefer Agent mode with MCP tools enabled over plain chat for gated turns.
- If the tool is skipped: `/optimize`, `call PromptMCP`, `run the efficiency engine`, or `gate this prompt`.
- Lead messy prompts with `@promptmcp:include` so the tag is hard to miss.
