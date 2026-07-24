# Status

**Last updated:** 2026-07-23  
**Direction:** **Open-source · local-only · BYOK** (AGPL-3.0-only + commercial dual-license)

## Confidence (engineering)
**High for the product loop under test** — not “hosts never skip tools.”

Verified:
- **50/50** automated tests (unit + contract + MCP stdio + CLI + polish/providers + consistency)
- Offline gates: smoke, mock eval **100**, flake spread **0**, auto-dogfood **PASS**, quality-loop, lean context **−86%**
- Live DeepSeek eval: mean composite **100**
- Soft-gate surfaces aligned (rules merge block, hosts, README recovery phrases)
- SaaS/market/Azure docs scrubbed of live monetization / personal lab details

## Ship sequence (agreed)
1. Perfect tool (this phase) → commit
2. Push to GitHub (needs `gh auth login`)
3. Manual polish later (real demo GIF)
4. Personal dogfood / final testing
5. Public + npm `1.4.0` + Sponsors

## Remaining maintainer actions
1. GitHub auth + `git push -u origin master`
2. `npm publish --access public --otp <code>` (after push)
3. Personal dogfood log n≥20 ([DOGFOOD_GATE.md](./DOGFOOD_GATE.md))
4. Optional real demo GIF replace [`docs/assets/demo.gif`](./assets/demo.gif)
5. GitHub About from [REPO_DESCRIPTION.md](./REPO_DESCRIPTION.md)

## Origin
https://share.google/aimode/OvN5swZbE704L26KA
