# Evaluation Suite — Rewriter Quality Gate

**Harness:** `npm run eval` · **Loop:** `npm run quality-loop` · **Program:** [IMPROVEMENT_PROGRAM.md](./IMPROVEMENT_PROGRAM.md)

## Rubric (R1–R10)

| ID | Pass if |
|----|---------|
| R1 | Required sections present |
| R2 | No code fences after sanitize |
| R3 | Validator OK |
| R4 | Objective ≤ 2 sentences / 280 chars |
| R5 | Forced paths retained |
| R6 | No filler/aesthetic leak words |
| R7 | Non-goals / boundaries when archetype needs them |
| R8 | Verification mentions test/typecheck/build/etc. |
| R9 | No tour language |
| R10 | Path budget respected |

**Composite** = % of R1–R10. **Gates:** mean ≥ 80; R1/R3 ≥ 95%; R6/R9 ≥ 90%; fails = 0.

## Cases (E01–E14)
Messy, planning, follow-up, concrete, vague, ignore, directives, overconstrained, contradictory, long ramble, multi-goal, underspecified bug, tour-risk.

## Latest measured (DeepSeek flash)
mean composite **99**, gates_passed **true** (see [SCORECARD.md](./SCORECARD.md)).
