# Workflow

Behavior the host agent and user should follow. Implementation should match this.

## Happy path

1. User sends a project-related message (coding or planning), optionally with `@promptmcp:` tags.
2. Host’s **first** action is `optimize_and_blueprint_intent` with the exact raw text (including directives) and absolute `workspace_root`.
3. MCP parses directives, gathers context, calls the rewriter, validates/injects forced paths, overwrites `Agent_Efficiency_MCP.md`.
4. MCP returns a freeze directive.
5. Host prints the pause line and **stops**. No edits, no extra reads, no terminal work, no long answers.
6. User reviews `Agent_Efficiency_MCP.md` (and may edit it).
7. User replies `GO` (case-insensitive is fine).
8. Host reads the latest blueprint and executes within it, including Media paths and Research URLs when listed.

Follow-ups are new gates. “Expand on the blockers” must call the tool again and overwrite the blueprint. Only a bare `GO` or an `ignore` tag skips optimization.

## Pause message

```markdown
### 🛑 Blueprint Generated. Awaiting your approval in `Agent_Efficiency_MCP.md`. Type GO to proceed.
```

## Freeze rules

After a successful tool return, until the user sends `GO`, the host must not:

- Edit or create project files (beyond what MCP already wrote)
- Run shell or package commands for the task
- Read more codebase files for the task
- Call other tools to start implementation

## Directives

Prefixes (same meaning): `@promptmcp:` · `@mcp:` · `@ourmcp:`

| Tag | Role |
|-----|------|
| `ignore` | Skip MCP. Answer normally. Do not call the tool. |
| `include` | Append cleaned original under `## Original Prompt` |
| `file[a, b]` | Force paths into Targeted Codebase Vectors |
| `media[img.png]` | Force media the agent inspects after GO |
| `search[url]` + note | Force research URLs after GO |
| `long` | Deep multi-phase worklist |
| `short` | Tight compression |
| `test` | Require tests in requirements and verification |
| `tone` | Keep emphatic priority cues |
| `diff` | Prefer git-changed files |
| `strict` | Never drop cited paths, media, or URLs |
| `help` | Cheat-sheet only (no freeze if help-only) |

Path-like tokens in the prompt body are force-merged even without `file`. Tags combine. Repeats merge.

## Conversational bypass

If the message contains `@promptmcp:ignore` (or `@mcp:` / `@ourmcp:`), the host must not call `optimize_and_blueprint_intent` and may answer normally.

Examples:

- `@mcp:ignore what does this function do?`
- `@promptmcp:ignore explain the error in the last message`

## Failure modes

| Situation | Expected behavior |
|-----------|-------------------|
| Missing key / local LLM down | Clear error markdown. Prefer pause over coding. |
| Provider or network error | Error details in the tool result. No fake blueprint. |
| Agent skips the tool | Rules + tool description are the mitigation. Known MCP limit. |
| Agent keeps going after the tool | Strengthen payload/rules. Treat as a bug if reproducible. |

## Blueprint lifecycle

- **Location:** `{workspace_root}/Agent_Efficiency_MCP.md` (from tool arg or `PROMPT_MCP_WORKSPACE`).
- **Write policy:** overwrite each optimize (atomic temp + rename).
- **Git:** runtime artifact. Gitignored in this repo. Consumers may gitignore it too.

## Approval vocabulary

| User input | Meaning |
|------------|---------|
| `GO` | Execute current `Agent_Efficiency_MCP.md` |
| Edit the file, then `GO` | Execute the edited blueprint |
| Chat adjustments before `GO` | Re-run optimize or update the blueprint per rules |
| `@promptmcp:ignore` | Skip the engine for this message |
| `@promptmcp:help` alone | Show cheat-sheet. No freeze. |
