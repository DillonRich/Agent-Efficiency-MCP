# Quality

## Rewrite quality

The engine builds a short agent task brief (goal, constraints, non-goals, targeted paths, verification). Output is tuned by provider dialect and prompt archetype (vague, overconstrained, contradictory, long, multi-goal, and similar).

| Layer | Role |
|-------|------|
| `CENTRAL_COMPRESSION_PROMPT` | Schema and token-efficiency rules |
| Provider dialect | Format quirks per API |
| Archetype strategy | Handling messy or conflicting prompts |
| Quality rubric | Self-check before finish |
| Boundary post-process | Inject non-goals, strip tour bullets |
| Validation repair | One retry on section or path failure |

Metrics in `Agent_Efficiency_MCP.md` are factual (`PROMPTMCP_META`). No invented “time saved” numbers. Includes `archetype` and `compression_ratio`.

## Quantitative gates (R1–R10)

Rubric: [EVAL.md](./EVAL.md). Latest numbers: [SCORECARD.md](./SCORECARD.md).

```bash
npm run quality-loop           # offline
npm run quality-loop -- --eval # + DeepSeek eval
npm run eval -- --provider deepseek
```

Targets: mean composite ≥ 80, R1/R3 ≥ 95%, R6/R9 ≥ 90%, 0 hard fails.

## Host gate success

MCP cannot force tool calls. Rates improve with PRIORITY 0 rules, host tips, `/optimize`, and Agent modes that allow tools.

## Recommended presets

| Goal | Config |
|------|--------|
| Cheap daily driver | `REWRITE_PROVIDER=deepseek` + flash model |
| Higher fidelity rewrite | Anthropic Sonnet or OpenAI 4.1 |
| Private | `REWRITE_PROVIDER=local` + a strong coder model (14B+) |
| Path-critical tasks | `@promptmcp:strict @promptmcp:file[...]` |
| Nuance retention | `@promptmcp:include` |

## Soft limits
- Host models may skip the MCP
- Slot-one tool calls cannot be protocol-enforced
