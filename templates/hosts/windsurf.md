# PromptMCP — Windsurf / Cascade host guidance

MCP config is usually `~/.codeium/windsurf/mcp_config.json` (written by `promptmcp init` when Windsurf is detected).

## Cascade instructions
Add to Windsurf rules / memories:

```markdown
<!-- PROMPTMCP:START -->
PRIORITY 0 — ZERO TOKENS BEFORE TOOL: call optimize_and_blueprint_intent first
with the user's exact message and absolute workspace_root. No other tools first.
Freeze until GO. Execute Agent_Efficiency_MCP.md only after GO.
Ignore bypass: @promptmcp:ignore.
Recovery: /optimize · call PromptMCP · run the efficiency engine · gate this prompt.
<!-- PROMPTMCP:END -->
```

## Windsurf-specific tips
- Cascade may parallelize tools — still make PromptMCP the **first** call.
- After GO, honor Media and Research sections before edits.
- Reload MCP from Cascade settings after init.
- Lead messy prompts with `@promptmcp:include` when Cascade skims natural language.
