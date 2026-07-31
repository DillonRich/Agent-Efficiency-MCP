# Roadmap

## Direction
AGPL-3.0-only local MCP with BYOK and a commercial dual-license path. Blueprint file: `Agent_Efficiency_MCP.md`.

## Done
- [x] Local MCP MVP (freeze, blueprint, validation)
- [x] Consumer rules and `/optimize` fallback
- [x] Multi-provider BYOK and local/LAN
- [x] Composable `@promptmcp:` directives
- [x] Eval, smoke, unit tests, CI
- [x] Docs, AGPL LICENSE, commercial contact
- [x] Provider retries, SSRF guards, path confinement, doctor CLI, npx launch
- [x] Media vision and blueprint history
- [x] Public GitHub and npm 1.4.8

## Next (optional)
- [ ] Community examples per IDE
- [ ] Real demo capture (replace storyboard GIF)
- [ ] VS Code first-call dogfood log
- [ ] Freeze UX for short clarifications without re-optimize

## Cancelled
- Stripe / SaaS metering / Azure multi-tenant rewriter business

## Soft limits
- Host models may skip the MCP. Rules and `/optimize` only.
- Slot-one tool calls cannot be protocol-enforced.
