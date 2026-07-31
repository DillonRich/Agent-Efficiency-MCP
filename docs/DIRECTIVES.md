# PromptMCP Directives

Directives are optional tags you put in a chat message to control how PromptMCP rewrites your prompt into `Agent_Efficiency_MCP.md`.

They are composable. Use any combination, in any order. Repeated `file` / `media` / `search` tags merge into one list.

## Prefixes

These are equivalent. Pick whichever you prefer:

| Prefix | Notes |
|--------|--------|
| `@promptmcp:` | Canonical |
| `@mcp:` | Short alias |
| `@ourmcp:` | Also accepted |

Examples: `@promptmcp:ignore`, `@mcp:long`, `@ourmcp:file[src/app.ts]`

Type `@promptmcp:help` alone in chat to print a short cheat-sheet (no freeze).

---

## Quick reference

| Directive | What it does |
|-----------|----------------|
| [`ignore`](#ignore) | Skip PromptMCP for this message; answer normally |
| [`include`](#include) | Keep your original wording in the blueprint |
| [`file`](#file) | Force specific files into the rewrite |
| [`media`](#media) | Force images / media the agent must inspect after `GO` |
| [`search`](#search) | Force websites the agent must research after `GO` |
| [`long`](#long) | Deep, multi-phase worklist |
| [`short`](#short) | Aggressive single-pass compression |
| [`test`](#test) | Require tests in the blueprint |
| [`tone`](#tone) | Keep emphatic conversational cues |
| [`diff`](#diff) | Prefer git-changed files |
| [`strict`](#strict) | Never drop your cited paths / media / URLs |
| [`help`](#help) | Show the cheat-sheet |

---

## Core flow (no directives)

1. You send a messy / normal task prompt.
2. The host calls PromptMCP → rewrite → writes `Agent_Efficiency_MCP.md`.
3. Agent freezes until you type **`GO`**.
4. Agent executes the approved blueprint.

Directives change *how* step 2 builds the blueprint. They do **not** remove the freeze/`GO` loop (except `ignore` and help-only).

---

## Command details

### `ignore`

**Skip the optimizer.** The host should answer conversationally and must not call PromptMCP.

```text
@promptmcp:ignore what does this function do?
@mcp:ignore explain the last error without rewriting anything
```

Use for: quick questions, explanations, chat that is not a project task.

---

### `include`

**Keep the original prompt** in the blueprint under `## Original Prompt`.

The machine rewrite stays at the top (dense, structured). Your cleaned original text is appended below so the coding agent still sees nuance the rewrite might have dropped.

```text
@promptmcp:include
Please carefully migrate the auth flow. I really care about not breaking existing sessions.
```

Tradeoff: more tokens for the coding agent after `GO`, higher fidelity.

---

### `file`

**Force-include file paths** in `## 3. Targeted Codebase Vectors`.

Syntax (brackets preferred; quotes also work):

```text
@promptmcp:file[src/server.ts, docs/PRODUCT.md]
@mcp:file"src/a.ts, src/b.ts"
```

Even **without** `file`, path-like tokens in your prompt (e.g. `src/engine.ts`) are auto-detected and force-merged. Use `file` when you want an explicit must-include list.

If the rewrite model omits a forced path, PromptMCP injects it into the blueprint anyway.

---

### `media`

**Force media / visual references** into `## Media / reference assets`.

On vision-capable providers (OpenAI, Anthropic, Gemini, xAI, local/compat), image files (png/jpg/gif/webp) are also attached to the rewrite call so the blueprint can reflect real UI. Disable with `PROMPT_MCP_VISION=0`. DeepSeek still forces paths for post-`GO` IDE inspection.

```text
@promptmcp:media[mockups/hero.png, brand/logo.svg]
Rebuild the landing hero to match these references.
```

Vision-capable providers receive image bytes during rewrite. After `GO`, the coding agent should still **open and inspect** those files. Disable vision with `PROMPT_MCP_VISION=0`.

Supports common image/video extensions (png, jpg, gif, webp, svg, mp4, …).

---

### `scope`

**Focus context gathering** under one or more path prefixes (reduces token waste).

```text
@promptmcp:scope[src/, scripts/]
@promptmcp:file[src/server.ts]
Harden error handling in the MCP server.
```

The workspace walk prefers paths under these prefixes. Forced `file` / `media` paths are still honored even if outside scope.

---

### `search`

**Force research URLs** into `## Research / web references`.

Put the URL (or site) in brackets. Optional **same-line note** describes what to look at:

```text
@promptmcp:search[https://stripe.com/docs/checkout] focus on embedded Checkout UX and dark theme
Wire a checkout flow that matches our brand.
```

```text
@promptmcp:search[https://tailwindcss.com/docs, https://ui.shadcn.com]
Match spacing and typography patterns from those docs.
```

After `GO`, the agent should browse those links and apply the notes. PromptMCP does not fetch the sites itself during rewrite.

---

### `long`

Deep, iterative worklist. Phases, ordered steps, longer verification checklist.

```text
@promptmcp:long
Turn this messy roadmap into a full implementation plan for the billing module…
```

Use for large or multi-day work, not a single short step.

---

### `short`

Aggressive compression. Minimal vectors, few bullets, one crisp objective.

```text
@promptmcp:short
Just rename the helper and update the one call site.
```

If both `long` and `short` appear, **`long` wins** (with a warning).

---

### `test`

**Require testing** in Technical Requirements and Verification Checkpoints (existing suite and/or new tests).

```text
@promptmcp:test
Add rate limiting to the public API.
```

---

### `tone`

**Preserve emphatic conversational cues** when they encode priority or non-negotiables.

Still strips empty pleasantries (“please”, “can you help”), but keeps signals like “do NOT break prod sessions” or “this is urgent / ugly but ship it.”

```text
@promptmcp:tone
This is CRITICAL. Do not touch the legacy billing path under any circumstances.
```

---

### `diff`

**Bias the rewrite toward current git-changed files** from the workspace.

```text
@promptmcp:diff
Finish whatever I was in the middle of in this branch.
```

---

### `strict`

**Never drop** user-cited files, media, or research URLs. Stronger enforcement of forced citations.

```text
@promptmcp:strict @promptmcp:file[src/auth.ts] @promptmcp:search[https://example.com/oauth]
Implement OAuth exactly against that file and doc.
```

---

### `help`

Print the directive cheat-sheet. If the message is **only** `help` (no task text), there is **no freeze** and no `Agent_Efficiency_MCP.md` overwrite required for a normal task run.

```text
@promptmcp:help
```

---

## Combining directives

Flags and args together:

```text
@promptmcp:include @promptmcp:long @promptmcp:test @promptmcp:strict
@promptmcp:file[src/server.ts, docs/PRODUCT.md]
@promptmcp:media[mockups/hero.png]
@promptmcp:search[https://stripe.com/docs/checkout] focus on embedded Checkout UX and dark theme patterns
Please wire a checkout flow that matches our brand.
```

What happens:

1. Tags are parsed and stripped from the body sent to the rewriter.
2. Forced files / media / URLs are injected into context and the final blueprint.
3. Modifiers (`long`, `test`, …) reshape the rewrite instructions.
4. With `include`, your cleaned original text is appended under `## Original Prompt`.
5. Agent freezes → you review → type **`GO`** → agent executes (including media + research).

---

## Tips

- Always pass the **full message verbatim** to the MCP tool (including `@…` tags). Do not strip them before the call.
- Run `npx agent-efficiency-mcp init` so PRIORITY 0 rules (`templates/00-promptmcp.mdc`) are installed and the host respects `ignore` / `GO` / freeze.
- Paths are relative to the project `workspace_root` unless absolute.
- Missing forced files on disk still appear in the blueprint, with a warning that they were not found.

## Related

- [Workflow (pause / GO)](./WORKFLOW.md)
- [Engine / providers](./ENGINE.md)
- [Install & BYOK](../README.md)
