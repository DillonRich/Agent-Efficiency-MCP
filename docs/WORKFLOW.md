# Workflow Contract

This document defines the **user and host-agent behavior** PromptMCP must produce. Implementation must match this contract.

## Happy path

1. User sends almost any project-related message (coding **or** planning/follow-ups like “expand on…”), optionally with `@promptmcp:` directives.
2. Host agent’s **first** action is `optimize_and_blueprint_intent` with the exact raw text (**verbatim, including directives**) **and** the absolute `workspace_root`.
3. MCP parses directives, gathers light context, calls the BYOK/local rewriter, validates/injects forced paths, overwrites `Agent_Efficiency_MCP.md`.
4. MCP returns a freeze directive.
5. Host agent prints a pause message (see template below) and **stops** — no file edits, no extra reads, no terminal work, **no essay answers**.
6. User reviews `Agent_Efficiency_MCP.md` (optionally edits it).
7. User replies `GO` (case-insensitive recommended).
8. Host agent reads the latest `Agent_Efficiency_MCP.md` and executes within those boundaries — including opening **Media** paths and browsing **Research** URLs when listed.

**Follow-ups are new gates.** “Expand on the blockers” is not exempt — it must call the tool again and overwrite `Agent_Efficiency_MCP.md`. Only a bare `GO` or an `ignore` directive skips optimization.

## Pause message (canonical)

```markdown
### 🛑 Blueprint Generated. Awaiting your approval in `Agent_Efficiency_MCP.md`. Type GO to proceed.
```

## Freeze rules (host must obey)
After the tool returns successfully, the host agent is **unauthorized** to:
- Edit or create project files (other than what MCP already wrote)
- Run shell / package commands for the task
- Read additional codebase files for the task
- Call other tools to start implementation

Until the user sends `GO`.

## Directives (composable)

Prefixes (equivalent): `@promptmcp:` · `@mcp:` · `@ourmcp:`

| Tag | Role |
|-----|------|
| `ignore` | Skip MCP; answer normally (host must not call the tool) |
| `include` | Append cleaned original under `## Original Prompt` |
| `file[a, b]` | Force-include paths in Targeted Codebase Vectors |
| `media[img.png]` | Force Media / reference assets (inspect after GO) |
| `search[url]` + same-line note | Force Research / web references |
| `long` | Deep iterative worklist |
| `short` | Aggressive compression |
| `test` | Require tests in requirements + verification |
| `tone` | Keep emphatic conversational cues |
| `diff` | Bias toward git-changed files |
| `strict` | Never drop user-cited paths/media/URLs |
| `help` | Cheat-sheet only (no freeze if message is help-only) |

Paths mentioned in the prompt body (even without `file`) are also force-merged. Combine tags freely; repeats merge.

## Bypass: conversational mode

If the user prompt contains `@promptmcp:ignore` / `@mcp:ignore` / `@ourmcp:ignore`, the host agent **must not** call `optimize_and_blueprint_intent` and may answer conversationally.

Examples:
- “@mcp:ignore what does this function do?”
- “@promptmcp:ignore explain the error in the last message”

## Failure modes

| Situation | Expected behavior |
|-----------|-------------------|
| Missing provider API key / local LLM down | Tool returns clear error markdown; still prefer pause over coding |
| Provider API / network error | Tool returns error details in content; no silent fake blueprint |
| Agent skips tool | Consumer rules + tool description are the mitigation; known MCP limitation |
| Agent continues after tool | Tool payload + rules must be strengthened; treat as bug if reproducible |

## `Agent_Efficiency_MCP.md` lifecycle

- **Location:** `{workspace_root}/Agent_Efficiency_MCP.md` (absolute path from tool arg or `PROMPT_MCP_WORKSPACE`).
- **Write policy:** overwrite current task blueprint each optimization (atomic temp + rename).
- **Git:** runtime artifact — gitignored in this repo; consumer projects may choose to gitignore too.

## Approval vocabulary

| User input | Meaning |
|------------|---------|
| `GO` | Execute using current `Agent_Efficiency_MCP.md` |
| Edits to `Agent_Efficiency_MCP.md` then `GO` | Execute using edited blueprint |
| Chat adjustments before `GO` | Agent should re-run optimize or update blueprint per rules |
| `@promptmcp:ignore` (or aliases) | Skip engine for this message |
| `@promptmcp:help` alone | Show directive cheat-sheet; no freeze |
