# Release checklist (OSS)

Commercial launch / Stripe items are retired. Use this for GitHub-ready local releases.

## Before first public push
- [ ] Confirm `.env` is **not** staged (`git status` / `git check-ignore .env`)
- [ ] Rotate any keys that ever appeared in chat/terminals
- [ ] `npm run build && npm test && npm run auto-dogfood && npm run quality-loop`
- [ ] Set GitHub About from [REPO_DESCRIPTION.md](./REPO_DESCRIPTION.md)
- [ ] Private push first, then public when ready

## Before tagging / npm `1.4.x`
- [ ] `npm run build` clean
- [ ] `npm run smoke` with at least one BYOK key (local)
- [ ] `npm run eval:mock` + optional `npm run eval -- --provider deepseek`
- [ ] `npm run flake-check`
- [ ] README install path works on a fresh clone
- [ ] `.env.example` matches real env vars (no secrets)
- [ ] LICENSE (AGPL-3.0) + CONTRIBUTING + SECURITY + COMMERCIAL present
- [ ] Consumer rule template matches freeze/`GO` + recovery contract
- [ ] STATUS.md / CHANGELOG.md / SCORECARD.md updated
- [ ] Demo GIF per [DEMO.md](./DEMO.md)
- [ ] `npm pack --dry-run` — no `.env`, no source maps if excluded

## Soft success metrics (portfolio / adoption)
- [ ] GitHub stars / clones trend
- [ ] Issues/PRs from real users
- [ ] Gate compliance log ([DOGFOOD_GATE.md](./DOGFOOD_GATE.md)) ≥70% first-call
- [ ] Blueprint edit-before-GO anecdotes
- [ ] A/B coding task: MCP on vs off (personal or community)
