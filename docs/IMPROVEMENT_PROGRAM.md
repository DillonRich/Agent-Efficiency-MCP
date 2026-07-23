# Improvement Program — continuous quality

**Goal:** Every messy / vague / overconstrained / contradictory / long prompt becomes a dense, executable blueprint that raises one-shot agent success and cuts token waste.

**Rules:** Iterate locally. **Do not push** to remotes unless the maintainer explicitly asks.

## Quantitative scorecard (R1–R10)

| ID | Metric | Pass condition |
|----|--------|----------------|
| R1 | Sections | Objective / Requirements / Vectors / Verification present |
| R2 | No code fences | Zero \`\`\` after sanitize |
| R3 | Validation | Engine validator OK |
| R4 | Objective density | 1–2 sentences, ≤ 280 chars |
| R5 | Forced paths | All `@promptmcp:file/media` retained |
| R6 | No filler | No please/thanks/elegant/beautiful in output |
| R7 | Boundaries | Non-goals / out-of-scope when archetype needs it |
| R8 | Verifiable | Checkpoints mention test/typecheck/build/observable check |
| R9 | No tour | Ban “explore the codebase / look around / read everything” |
| R10 | Path budget | §3 bullets ≤ max(6, forced+2) |

**Composite** = % of R1–R10 true (0–100).

### Release gates (live eval)
| Gate | Target |
|------|--------|
| mean composite | ≥ **80** |
| R1 / R3 pass rate | ≥ **95%** |
| R6 / R9 pass rate | ≥ **90%** |
| hard failures | **0** |

Run: `npm run eval -- --provider deepseek`  
Loop: `npm run quality-loop` (offline) or `npm run quality-loop -- --eval`

## Prompt archetypes handled
messy_polite · vague · overconstrained · contradictory · long_ramble · multi_goal · follow_up · planning · concrete · underspecified

Strategy injection: `src/quality/archetype.ts` → system prompt.

## Long checklist

### A. Rewrite quality (core product)
- [x] Goal / constraints / non-goals / verification template
- [x] Archetype-aware strategies
- [x] R1–R10 deterministic scorer
- [x] Expanded eval cases (E01–E14)
- [x] Raise mean composite ≥ 85 on DeepSeek flash (**100** measured, R1–R10 all 100%)
- [ ] Raise mean composite ≥ 90 on Sonnet / GPT-4.1 (optional — blocked without those keys; DeepSeek/mock at 100)
- [x] Golden snapshots reviewed for E09–E14 (GO-worthiness mean 4.3/5) — [GOLDEN_REVIEW.md](./GOLDEN_REVIEW.md); tracked under `fixtures/eval/reviewed/`
- [x] Second repair pass only when composite < 70 (adaptive)
- [x] Post-process inject Non-goals stub if model omits and archetype needs it
- [x] Stack-aware verification command suggestions (npm / typecheck inject)

### B. Context efficiency (token waste upstream)
- [x] Capped tree walk + forced snippets
- [x] Skeleton/signature mode for large forced files (first N lines + exports)
- [x] Drop low-signal git noise when prompt is concrete (lean: no git log / docs)
- [x] Dynamic context budget by archetype (vague → rich; concrete → lean)
- [x] Measure avg `context_bytes` lean vs rich — **87%** reduction (2035 vs 15647); target 15%

### C. Reliability / hardening
- [x] Retries, SSRF, path confinement, doctor, history, vision
- [x] Circuit-break repeated provider 401s with clear doctor hint
- [x] Offline mock-provider fixture for CI eval (`REWRITE_PROVIDER=mock`, `npm run eval:mock`) without keys
- [x] Flake budget: eval variance < 5 composite points across 3 runs (`npm run flake-check`)

### D. Host gate success (soft)
- [x] PRIORITY 0 rules + /optimize + zero-token-before-tool + doctor refresh check
- [x] Dogfood log template + `npm run dogfood-summary` ([docs/DOGFOOD_GATE.md](./DOGFOOD_GATE.md))
- [ ] Target: ≥ 70% first-call gate rate on Cursor Agent in personal dogfood (n≥20) — maintainer turns

### E. Professional surfaces
- [x] AGPL consistency, SECURITY, CI, README thicken
- [x] Demo GIF (install → freeze → GO) — `docs/assets/demo.gif` / `npm run demo-gif`
- [x] First commit (no secrets) — `7d21be4`; remote `origin` set; push blocked on GitHub auth
- [ ] npm 1.4.x full publish — prepublish gates green; needs `npm publish --otp <code>`
- [x] Sponsors file present (`.github/FUNDING.yml`); enable on GitHub after public

### F. New capabilities (priority order)
- [x] Post-process Non-goals injector
- [x] Adaptive repair using composite score gaps
- [x] `@promptmcp:scope[path]` directive (force focus directory)
- [x] Blueprint diff mode when prior HUD exists (what changed)
- [x] Eval dashboard markdown trend (last 10 scorecards)

## Iteration workflow
1. `npm run quality-loop` (offline gates)
2. `npm run quality-loop -- --eval` when key available
3. Read `docs/SCORECARD.md` + failing R-ids
4. Patch prompts / post-process / context — smallest change that moves the metric
5. Re-run eval; only keep changes that raise mean composite or a target R without regressing R3
6. Update this checklist checkboxes
7. **Never git push** unless asked

## Research anchors used
- Anatomy of a perfect AI agent task (goal, constraints, non-goals, acceptance, verification)
- Google Cloud tokenomics / plan-then-execute
- Context engineering: targeted retrieval over tours; one job per session

## Soft ceiling
Host models can skip MCP tools. Rewrite quality can be excellent; gate compliance remains host-dependent.
