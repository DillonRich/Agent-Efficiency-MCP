# PromptMCP — VS Code / GitHub Copilot host guidance

Use with `.vscode/mcp.json` from `promptmcp init` (root key `servers`).

## Copilot Chat / Agent
1. Ensure MCP server `agent-efficiency-engine` is enabled.
2. Add this to workspace instructions / `.github/copilot-instructions.md` (merge; do not delete other content):

```markdown
<!-- PROMPTMCP:START -->
PRIORITY 0: For any project task, first call MCP tool optimize_and_blueprint_intent
(raw_prompt=verbatim user message, workspace_root=absolute workspace path).
Then freeze until the user types GO. Read Agent_Efficiency_MCP.md on GO.
Bypass only with @promptmcp:ignore. Help: @promptmcp:help.
<!-- PROMPTMCP:END -->
```

## Copilot-specific tips
- Copilot often answers from context without tools — the instruction block above must stay PRIORITY 0.
- Prefer Agent mode with MCP tools enabled over plain chat for gated turns.
- If the tool is skipped, user should say: `call PromptMCP` or `/optimize`.
