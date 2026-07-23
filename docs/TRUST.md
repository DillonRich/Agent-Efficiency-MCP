# Trust & compliance checklist

Production credibility for an OSS MCP tool rests on honesty, safety, and clear boundaries.

## Legal / licensing
- [x] AGPL-3.0-only `LICENSE` present
- [x] Commercial dual-license path documented (`docs/COMMERCIAL.md`)
- [x] No proprietary code copied without attribution
- [x] Third-party product names (Cursor, Claude, Windsurf, VS Code) used only for **compatibility documentation**

## Secrets & safety
- [x] `.env` gitignored
- [x] `.env.example` has placeholders only
- [x] No keys in README / docs (placeholders like `sk-...`)
- [x] HTTP timeouts on rewrite + enrich fetches
- [x] Forced paths confined under `workspace_root` (no `..` escape)

## Product honesty
- [x] No hallucinated “minutes saved” metrics
- [x] Soft freeze documented (host models can skip; rules maximize compliance)
- [x] BYOK / local privacy claims match implementation
- [x] Media/search are force-included for the IDE agent after `GO` (enrichment optional)

## Publish readiness
- [x] npm name `agent-efficiency-mcp` claimed (`0.0.1` placeholder; full publish later)
- [ ] GitHub repo public with clear README
- [ ] npm account + 2FA
- [ ] `npm publish` from clean tree
- [ ] Demo GIF / short video

## User-facing trust signals
1. AGPL + SECURITY + PRIVACY + COMMERCIAL linked from README  
2. Reproducible `npm run smoke` / `npm run eval`  
3. Demo showing install → messy prompt → blueprint → GO  
4. Transparent “what we don’t do” (no SaaS billing, no PromptMCP cloud)
