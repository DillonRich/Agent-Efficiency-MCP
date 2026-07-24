# Architecture

## High-level flow

```text
[ Developer IDE: Cursor ]
         │  user types messy prompt
         ▼
[ Host agent ] ──calls──► optimize_and_blueprint_intent(raw_prompt, workspace_root)
         │                         │
         │                         ├─ validate absolute workspace_root
         │                         ├─ git diff / status (light) in that root
         │                         ├─ readdir top-level + package.json summary
         │                         ▼
         │                   [ BYOK provider: DeepSeek / OpenAI / Anthropic / compat ]
         │                         │
         │                         ▼ structured markdown blueprint
         │                   validate (no code / known paths only)
         │                   write {workspace_root}/Agent_Efficiency_MCP.md
         │                         │
         ◄── freeze directive ─────┘
         │
         ▼
[ Agent prints pause message and STOPS ]
         │
         ▼ user reviews Agent_Efficiency_MCP.md
         │
         ▼ user types GO
         │
[ Agent reads Agent_Efficiency_MCP.md and executes task ]
```

## Components

| Component | Location | Role |
|-----------|----------|------|
| MCP server | `src/server.ts` | Tool registration, orchestration, freeze response |
| Rewrite engine | `src/engine.ts` + `src/providers/*` | Provider switch + validate |
| Context gatherer | `src/context.ts` | `workspace_root` resolve, git/fs, atomic write |
| Validator | `src/validate.ts` | Required sections, path allowlist, strip code fences |
| Consumer rules | `templates/00-promptmcp.mdc` | Installed by `init` into `.cursor/rules/` |
| Env config | `.env` / MCP `env` | BYOK provider keys (`REWRITE_PROVIDER=auto` …) |
| Blueprint artifact | `Agent_Efficiency_MCP.md` (runtime, gitignored) | Human + agent HUD |

Archived (not product path): `services/gateway`, `infra/stripe`, `infra/resend`, `infra/azure`.

## Trust boundaries
- **Local only:** MCP process holds *your* provider key; calls that provider directly from your machine.
- No PromptMCP cloud, metering, or license key. Prompts never leave your machine except to the LLM API you configured.

## MCP constraints (hard truths)
1. MCP servers are **reactive**. They cannot block the IDE or inject custom chat widgets.
2. Freeze behavior is achieved by: aggressive tool description + consumer rules + tool return text that asks a direct question and forbids further tool use.
3. Reliability is high with frontier models + strict rules, but never 100% protocol-enforced.
4. **Do not use `process.cwd()` alone** for writing blueprints — Cursor often sets cwd to the MCP install directory.

## Context strategy

**Implemented:**
- Absolute `workspace_root` from tool arg (or `PROMPT_MCP_WORKSPACE`)
- `git diff` / `git status` name lists with safe fallbacks
- Top-level directory listing (capped)
- `package.json` name + dependency key summary when present

**Later (OSS enhancements):**
- Deeper dependency / import map
- Optional external workspace-mapping MCP
- Semantic / vector retrieval of top N files

## Tool surface

### `optimize_and_blueprint_intent`
- **Input:**
  - `raw_prompt` (string, required)
  - `workspace_root` (string, absolute path, required unless env fallback set)
- **Side effect:** overwrite `{workspace_root}/Agent_Efficiency_MCP.md`
- **Output:** text content instructing host to stop and await `GO`

## Providers (BYOK)
- Default detection under `REWRITE_PROVIDER=auto`: DeepSeek → OpenAI → Anthropic → Gemini → xAI → local → OpenAI-compat
- Local/LAN: `REWRITE_PROVIDER=local` + `LOCAL_LLM_BASE` (Ollama/LM Studio/vLLM on this PC or mini-PC)
