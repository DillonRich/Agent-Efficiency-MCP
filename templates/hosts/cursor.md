# PromptMCP — Cursor Composer / Agent tips

Cursor uses `.cursor/rules/00-promptmcp.mdc` (installed by `promptmcp init`).

## Composer-specific failure modes
Composer / fast models frequently skip MCP on:
- planning / "expand on…" follow-ups
- short messages
- "advisory" framing

Mitigations already in `00-promptmcp.mdc`:
- every message gated unless ignore / GO / help-only
- explicit forbid of essay-before-tool
- `/optimize` fallback

## User habits that raise success rate
1. Keep `00-promptmcp.mdc` with `alwaysApply: true` and `00-` prefix.
2. If skipped once, say: `call PromptMCP` or `/optimize`.
3. Prefer Agent/Composer with MCP tools enabled.
4. Lead messy prompts with `@promptmcp:include` so the tag is hard to miss.
5. Use `@promptmcp:strict` when paths must stick.
6. Log outcomes in `fixtures/dogfood/gate-log.csv` (see `docs/DOGFOOD_GATE.md`).

## Grok / other Cursor models
Same rules file applies. Grok tends to obey imperative PRIORITY 0 language better than soft suggestions — keep the rule imperative ("MUST call"), not advisory ("consider calling").
