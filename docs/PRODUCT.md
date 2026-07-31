# Product

## Name
**PromptMCP** (npm / CLI: Agent Efficiency Engine)

## What it is
A local MCP server that rewrites IDE prompts into a structured blueprint (`Agent_Efficiency_MCP.md`) and freezes the coding agent until you type `GO`.

## License and distribution
AGPL-3.0-only, local-only, bring your own API key. No paid cloud for the tool itself. Closed-source use needs a commercial license ([COMMERCIAL.md](./COMMERCIAL.md)).

Install the MCP, put your provider key in the MCP server `env` via `configure`, and run on your machine.

## Problem
- Vague prompts waste turns and tokens on top of Cursor / Claude / Copilot bills.
- Prompt “optimizers” that dump text into chat often let the agent keep coding anyway.
- Another mandatory SaaS fee for a thin rewrite layer is a hard sell. This is meant to be something you would actually run locally.

## Solution
1. Host calls `optimize_and_blueprint_intent` with the raw prompt and absolute `workspace_root`.
2. Local MCP gathers light git/fs context.
3. Your chosen LLM rewrites intent (no code generation).
4. Overwrite `Agent_Efficiency_MCP.md` and return a hard freeze until `GO`.

## Who it is for
**In:** People who already pay for an IDE or model, want a review step before edits, and will run a free local MCP with their own key.  
**Out:** Workflows that refuse any `GO` friction.

## In scope
- Local stdio MCP, AGPL-3.0-only, commercial dual-license contact
- BYOK providers: DeepSeek, OpenAI, Anthropic, Gemini, xAI/Grok, local/LAN OpenAI-compat, `openai_compat`, `auto`
- `@promptmcp:` directives (`include`, `file`, `media`, `search`, `long`, …)
- Media vision where the provider supports it, SSRF-safe URL enrich, blueprint history
- Freeze rules, `/optimize` recovery, `doctor` CLI
- Eval, smoke, unit tests, CI

## Out of scope
- Hosted paid tiers, Stripe trials, cloud metering
- Custom Cursor Accept/Reject UI (platform limit)
- Guaranteeing every host model auto-calls the tool (soft compliance only)

## Success signals
- Clean install to first `GO` in under 15 minutes
- Blueprint quality with real BYOK providers
- Useful issues and PRs
- Daily personal use as dogfood
