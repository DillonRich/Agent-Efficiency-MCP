# Status

**Last updated:** 2026-07-22  
**Direction:** **Open-source · local-only · BYOK** (AGPL-3.0-only + commercial dual-license)

## Current state
- Package: **agent-efficiency-mcp@1.4.0**
- Quality: R1–R10 scorecard; mock + DeepSeek eval **100**; lean context **−87%** vs rich
- Features: multi-provider BYOK, vision, archetypes, scope, history, delta, doctor/uninstall, CI
- Demo GIF: [`docs/assets/demo.gif`](./assets/demo.gif) (regenerate with `npm run demo-gif`)
- Goldens E09–E14: GO-reviewed — [`GOLDEN_REVIEW.md`](./GOLDEN_REVIEW.md)
- Soft gate: zero-token-before-tool rules + `/optimize` recovery + `npm run dogfood-summary`
- GitHub: https://github.com/Agent-Efficiency-MCP/Agent-Efficiency-MCP
- Sponsors: [`.github/FUNDING.yml`](../.github/FUNDING.yml) (`github: Agent-Efficiency-MCP`)
- Continuous loop: paused (local quality ticks; **no auto-push**)

## Metrics snapshot
See [SCORECARD.md](./SCORECARD.md) · [EVAL_TREND.md](./EVAL_TREND.md) · [IMPROVEMENT_PROGRAM.md](./IMPROVEMENT_PROGRAM.md)

## Remaining maintainer actions (need human / credentials)
1. `git push -u origin master` (remote set; needs GitHub auth / PAT)
2. `npm publish --access public --otp <code>` (2FA OTP required; package ready at 1.4.0)
3. Personal dogfood gate log n≥20 → ≥70% first-call ([DOGFOOD_GATE.md](./DOGFOOD_GATE.md))
4. Optional Sonnet/GPT eval when those API keys exist
5. Confirm GitHub About text from [REPO_DESCRIPTION.md](./REPO_DESCRIPTION.md) after push

## Origin
https://share.google/aimode/OvN5swZbE704L26KA
