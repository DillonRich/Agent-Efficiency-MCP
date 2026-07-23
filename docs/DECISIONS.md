# Decisions Log

Append-only. Newest first.

---

## 2026-07-22 — High-value polish pass (8 improvements)
**Status:** Accepted  

Expanded roadmap: gate reliability via merge-safe PRIORITY 0 rules; rich workspace context; quality/eval; `promptmcp init` multi-host install; post-GO checklist; `list_promptmcp_directives`; factual metrics + `PROMPT_MCP_DRY_RUN`; blueprint renamed to `Agent_Efficiency_MCP.md` (no hallucinated time-saved).

---

## 2026-07-22 — Composable @promptmcp: directives
**Status:** Accepted  

User-facing tags (`ignore`, `include`, `file`, `media`, `search`, `long`, `short`, `test`, `tone`, plus `diff` / `strict` / `help`) parse from `raw_prompt`. Canonical prefix `@promptmcp:`; aliases `@mcp:` and `@ourmcp:`. Media/search are blueprint force-includes for post-GO host action (no MCP vision/browse in v1). Combinations merge; `long` wins over `short`.

---

## 2026-07-22 — Pivot to open-source local BYOK (no paid SaaS; later AGPL)
**Status:** Accepted  

Research + founder ICP: thin paid MCP add-ons convert poorly; users already pay Cursor/Claude/Copilot; easy to clone. PromptMCP becomes a **self-sufficient local MCP**: install, put your own API key in env, run. Goal = GitHub stars + portfolio + personal use — not subscription ARR. Commercial Stripe/Azure multi-tenant plans are **superseded / cancelled**.

---

## 2026-07-22 — Phase 0 HF bake-off deferred (credentials)
**Status:** Superseded  

Azure/HF lab was for self-hosted commercial rewriter. Under BYOK OSS, users bring any provider (including their own vLLM via `openai_compat`). Lab notes may remain for optional local experiments but are not on the critical path.

---

## 2026-07-22 — Go fully: trial + paid tiers
**Status:** Superseded (by OSS BYOK pivot)

Was: prices ~$15 / $25 / $40, 10-day trial with card. Cancelled — see pivot entry above.

---

## 2026-07-22 — Pursue as focused product; expect fast copy / platform nibble
**Status:** Accepted (reframed for OSS)

PromptMCP adds real vibe-coding value (rewrite + approve + freeze). It is not a permanent moat — others can clone it. Worth owning the open-source reference implementation for portfolio + personal use; do not depend on secrecy of the idea.

---

## 2026-07-22 — Commercial inference: keep key control + tiers (cloud, not home GPUs)
**Status:** Superseded

Was: cloud-hosted rewriter + call metering. Replaced by local BYOK to user-chosen providers.

Product framing: sell *PromptMCP’s* rewrite quality, not “we proxy Claude.” Premium = bigger/better *your* model or higher call quotas, not mislabeled frontier API access.

Rejected for production scale: physical home hosting. BYOK remains valid for MVP/hobby.

---

## 2026-07-22 — Host-model compliance is a product variable
**Status:** Accepted  

Empirical: Grok 4.5 obeyed the PromptMCP gate; Composer 2.5 repeatedly skipped after rule hardening + reload. Treat “will the host call our tool?” as model-dependent. Mitigations to consider later: explicit slash/prompt invoke, user-visible “Optimize” reminder, optional dual-path (auto-gate when obedient, manual call when not). Do not promise 100% auto-intercept in marketing.

---

## 2026-07-21 — Gate every non-exempt turn (including follow-ups)
**Status:** Accepted  

Live testing showed models skip the MCP on “planning / expand on…” turns. Consumer rule + tool description now treat **every** user message as gated unless `@mcp:ignore` or bare `GO`. Follow-ups must re-run optimize and overwrite `Agent_Efficiency_MCP.md`. Rules file renamed to `00-promptmcp.mdc` for sort priority. Compliance is still soft (host model can disobey); no protocol-level hard lock exists.

---

## 2026-07-21 — Required `workspace_root` tool argument
**Status:** Accepted  

MCP `process.cwd()` is unreliable for finding the open IDE project. The tool requires an absolute `workspace_root` (fallback: env `PROMPT_MCP_WORKSPACE`). `Agent_Efficiency_MCP.md` is always written under that root.

---

## 2026-07-21 — DeepSeek model `deepseek-v4-flash`
**Status:** Accepted  

Use official endpoint `https://api.deepseek.com/chat/completions` with model `deepseek-v4-flash` (override via `DEEPSEEK_MODEL`). Do **not** use legacy `deepseek-chat` (deprecated 2026-07-24).

---

## 2026-07-21 — Post-process blueprints before write
**Status:** Accepted  

After DeepSeek returns, strip fenced code blocks, drop invented path bullets not in known context, require section headers, append approval footer if missing. Fail the tool call if structure is missing.

---

## 2026-07-21 — Workspace docs-first setup
**Status:** Accepted  

Scaffold alignment docs, Cursor rules, and hierarchy **before** implementing MCP code.

---

## 2026-07-21 — Build as MCP, not a skill-only package
**Status:** Accepted  

MCP provides live backend execution, filesystem writes, outbound API calls, and future metering. Skills/rules alone cannot own the product loop.

---

## 2026-07-21 — No silent prompt interception
**Status:** Accepted  

MCP cannot MITM the IDE. Interception is simulated via mandatory tool description + consumer workspace rules.

---

## 2026-07-21 — Blueprint file + GO gate (not custom chat UI)
**Status:** Accepted  

MCP cannot inject Accept/Reject widgets. Use `Agent_Efficiency_MCP.md` as HUD and require user `GO` before execution.

---

## 2026-07-21 — Hard freeze via tool return + rules
**Status:** Accepted  

Tool response must state unauthorized-to-proceed and ask a direct question so the host idles. Reinforced by consumer `.cursorrules`.

---

## 2026-07-21 — Bypass tag `@mcp:ignore`
**Status:** Accepted  

Allows conversational alignment without disabling the MCP server.

---

## 2026-07-21 — DeepSeek as rewrite backend for MVP
**Status:** Accepted  

User has DeepSeek API credits. Local MCP calls DeepSeek directly for live rewrite. Cloud proxy deferred. Model ID refined in later decision (`deepseek-v4-flash`).

---

## 2026-07-21 — Engine is structural only (no code)
**Status:** Accepted  

DeepSeek must not invent implementation code or file paths. Prevents hallucination as a product risk.

---

## 2026-07-21 — Light context only in MVP
**Status:** Accepted  

`git diff --name-only` + capped top-level listing. Full indexing / RAG later.

---

## 2026-07-21 — Single tool in MVP
**Status:** Accepted  

One tool `optimize_and_blueprint_intent`. Separate precision/cost tools deferred.

---

## 2026-07-21 — Subscription / quota monetization (not per-prompt invoices)
**Status:** Accepted  

Per-prompt $0.02 billing is hostile to Stripe fee structure and UX. Future: tiers or prepaid wallet.

---

## 2026-07-21 — TypeScript / Node / stdio
**Status:** Accepted  

Local MVP stack: TypeScript, NodeNext modules, MCP stdio transport.

---

## 2026-07-21 — Positioning: efficiency & cost, not “prompt tool”
**Status:** Accepted  

Marketing and README framing emphasize agent efficiency, accuracy, cost mitigation.
