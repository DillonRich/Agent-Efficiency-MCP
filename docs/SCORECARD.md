# Scorecard (auto)

Updated: 2026-07-24T04:01:38.896Z

## Offline gates
- typecheck / unit / smoke(offline): PASS
- archetype fixture classify: PASS

## Targets (live eval)
| Metric | Target |
|--------|--------|
| mean composite | ≥ 80 |
| R1 sections | ≥ 95% |
| R3 validation | ≥ 95% |
| R6 no filler | ≥ 90% |
| R9 no tour | ≥ 90% |
| hard fails | 0 |

## Latest eval
```json
{
  "cases": 14,
  "fails": 0,
  "mean_composite": 100,
  "pass_counts": {
    "r1_sections": 14,
    "r2_no_fences": 14,
    "r3_validation": 14,
    "r4_objective_density": 14,
    "r5_forced_paths": 14,
    "r6_no_filler": 14,
    "r7_boundaries": 14,
    "r8_verifiable": 14,
    "r9_no_tour": 14,
    "r10_path_budget": 14
  },
  "pass_rates_pct": {
    "r1_sections": 100,
    "r2_no_fences": 100,
    "r3_validation": 100,
    "r4_objective_density": 100,
    "r5_forced_paths": 100,
    "r6_no_filler": 100,
    "r7_boundaries": 100,
    "r8_verifiable": 100,
    "r9_no_tour": 100,
    "r10_path_budget": 100
  }
}
```


See [EVAL.md](./EVAL.md) and [QUALITY.md](./QUALITY.md).
