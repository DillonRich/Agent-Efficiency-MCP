# Quality & cross-model accuracy

## Rewrite quality

The engine builds a **professional agent task brief** (goal · constraints · non-goals · targeted paths · verification), tuned per provider dialect + **prompt archetype** (vague, overconstrained, contradictory, long, multi-goal, …).

| Layer | Role |
|-------|------|
| `CENTRAL_COMPRESSION_PROMPT` | Schema + token-efficiency rules |
| Provider dialect | Format compliance quirks |
| Archetype strategy | Handling messy/vague/conflict prompts |
| Quality rubric | Self-check before finish |
| Boundary post-process | Inject Non-goals / strip tour bullets |
| Validation repair | One retry on section/path failure |

Metrics in `Agent_Efficiency_MCP.md` are factual (`PROMPTMCP_META`) — never hallucinated time-saved. Includes `archetype` + `compression_ratio`.

## Quantitative gates (R1–R10)

Rubric: [EVAL.md](./EVAL.md). Latest numbers: [SCORECARD.md](./SCORECARD.md).

```bash
npm run quality-loop           # offline
npm run quality-loop -- --eval # + DeepSeek eval
npm run eval -- --provider deepseek
```

Targets: mean composite ≥ 80; R1/R3 ≥ 95%; R6/R9 ≥ 90%; 0 hard fails.

## Host gate success ratio

MCP cannot force tool calls. Success rate rises with PRIORITY 0 rules, host tips, `/optimize`, and Agent modes with tools enabled.

## Recommended presets

| Goal | Suggested config |
|------|------------------|
| Cheap daily driver | `REWRITE_PROVIDER=deepseek` + `DEEPSEEK_MODEL=flash` |
| Higher fidelity rewrite | Anthropic Sonnet or OpenAI 4.1 |
| Private | `REWRITE_PROVIDER=local` + strong coder model (14B+) |
| Path-critical tasks | `@promptmcp:strict @promptmcp:file[...]` |
| Nuance retention | `@promptmcp:include` |

## Soft / known limits
- Host models may skip the MCP
- Cannot protocol-force slot-one tool calls
