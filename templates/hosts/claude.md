# PromptMCP — Claude / Anthropic host guidance

Paste into Claude Desktop project instructions or Claude Code memory **in addition to** MCP registration (`promptmcp init`).

## Hard gate
**Zero tokens before the tool.** First action on project work: call MCP tool `optimize_and_blueprint_intent` with:
- `raw_prompt` = the user's message verbatim (keep `@promptmcp:` tags)
- `workspace_root` = absolute project path

Then output only the freeze line and wait for `GO`.

## Claude-specific tips
- Do not write a long plan before the tool — Claude often "helps first"; that skips the gate.
- Prefer a single tool call, then silence until GO.
- Recovery phrases: `/optimize`, “run the efficiency engine”, “call PromptMCP”, “gate this prompt”.
- On `GO`, follow `Agent_Efficiency_MCP.md` strictly; open Media and browse Research when listed.
- `@promptmcp:ignore` is the only conversational bypass. Tip: lead with `@promptmcp:include`.

## Directives
See PromptMCP `docs/DIRECTIVES.md` or call tool `list_promptmcp_directives`.
