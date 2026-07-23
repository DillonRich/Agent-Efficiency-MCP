# PromptMCP — Windsurf / Cascade host guidance

MCP config is usually `~/.codeium/windsurf/mcp_config.json` (written by `promptmcp init` when Windsurf is detected).

## Cascade instructions
Add to Windsurf rules / memories:

```markdown
<!-- PROMPTMCP:START -->
PRIORITY 0 gate: Before coding or planning, call optimize_and_blueprint_intent
with the user's exact message and absolute workspace_root.
Freeze until GO. Execute Agent_Efficiency_MCP.md only after GO.
Ignore bypass: @promptmcp:ignore
<!-- PROMPTMCP:END -->
```

## Windsurf-specific tips
- Cascade may parallelize tools — still make PromptMCP the **first** call.
- After GO, honor Media and Research sections before edits.
- Reload MCP from Cascade settings after init.
