# Product

## Working name
**PromptMCP** (Agent Efficiency Engine)

## One-liner
Open-source local MCP server that rewrites messy IDE prompts into dense engineering blueprints, writes `Agent_Efficiency_MCP.md`, and freezes the coding agent until you type `GO`.

## Distribution model
**AGPL-3.0-only open source · local-only · bring your own API key (BYOK).**  
No paid cloud subscription for the tool itself. Closed-source / proprietary use requires a commercial license ([COMMERCIAL.md](./COMMERCIAL.md)). Users install the MCP, put their own provider key in `.env` / MCP env, and run entirely on their machine.

## Problem
- Vague prompts → multi-turn agent thrash and wasted tokens (on top of Cursor/Claude/Copilot bills).
- Chat-dump optimizers often let the agent keep running.
- Paying *another* SaaS fee for a thin MCP layer has weak willingness-to-pay; this project is the tool its author would actually use.

## Solution
1. Host calls `optimize_and_blueprint_intent` with raw prompt + `workspace_root`.
2. Local MCP gathers light git/fs context.
3. **User-chosen** LLM (DeepSeek / OpenAI / Anthropic / any OpenAI-compatible endpoint) rewrites intent (no code generation).
4. Overwrite `Agent_Efficiency_MCP.md`; return hard freeze until `GO`.

## Positioning
Not a “prompt theater” SaaS. Portfolio-grade OSS for **serious vibe coders** who want quality and control:
- Agent efficiency / one-shot success
- Controllable pause before edits
- Editable blueprint HUD

## Target audience
**In:** Careful builders who already pay for an IDE/model and won’t add another monthly tool fee — but will run a free local MCP with their own key.  
**Out:** Speed-only slop workflows that reject any `GO` friction.

## In scope
- Local stdio MCP, AGPL-3.0-only (+ commercial dual-license contact)
- BYOK providers: DeepSeek, OpenAI, Anthropic, Gemini, xAI/Grok, local/LAN OpenAI-compat, plus generic `openai_compat` / `auto`
- Composable `@promptmcp:` directives (`include`, `file`, `media`, `search`, `long`, …)
- Media vision for vision-capable providers; SSRF-safe URL enrich; blueprint history
- `Agent_Efficiency_MCP.md` + freeze + consumer rules + `/optimize` + `doctor` CLI
- Eval/smoke/unit tests + CI

## Out of scope
- PromptMCP-hosted paid tiers, Stripe trials, cloud metering SaaS
- Custom Cursor Accept/Reject UI (platform limit)
- Guaranteeing every host model auto-calls the tool (soft compliance)

## Success metrics
- GitHub stars / forks / useful issues (portfolio + community)
- Users complete install → first `GO` loop in &lt;15 minutes
- Blueprint quality with BYOK providers
- Optional: personal daily use as dogfood
