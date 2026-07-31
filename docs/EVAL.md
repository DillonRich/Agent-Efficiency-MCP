# Evaluation (rewriter quality gate)

**Harness:** `npm run eval` · **Loop:** `npm run quality-loop` · **Layers:** [QUALITY.md](./QUALITY.md)

## Rubric (R1–R10)

| ID | Pass if |
|----|---------|
| R1 | Required sections present |
| R2 | No code fences after sanitize |
| R3 | Validator OK |
| R4 | Objective ≤ 2 sentences / 280 chars |
| R5 | Forced paths retained |
| R6 | No filler or aesthetic leak words |
| R7 | Non-goals / boundaries when the archetype needs them |
| R8 | Verification mentions test/typecheck/build (when appropriate) |
| R9 | No tour language |
| R10 | Path budget respected |

**Composite** = % of R1–R10. **Gates:** mean ≥ 80, R1/R3 ≥ 95%, R6/R9 ≥ 90%, fails = 0.

## Cases (E01–E14)
Messy, planning, follow-up, concrete, vague, ignore, directives, overconstrained, contradictory, long ramble, multi-goal, underspecified bug, tour-risk.

## Latest measured (DeepSeek flash)
Mean composite **99**, gates_passed **true**. See [SCORECARD.md](./SCORECARD.md).
