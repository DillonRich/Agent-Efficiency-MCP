# Gate compliance dogfood log

Manual tracking for host soft-gate success (MCP cannot force tool calls).

## Automated dogfood (offline)
```bash
npm run auto-dogfood
```
Runs install → doctor → mock optimize turns for all eval cases → freeze contract checks → `dogfood-summary` on a synthetic CSV.  
**Important:** synthetic host outcomes prove tooling + product loop; they do **not** replace personal Cursor first-call logging.

## How to use (personal / real host)
1. Copy [`fixtures/dogfood/gate-log.template.csv`](../fixtures/dogfood/gate-log.template.csv) to `fixtures/dogfood/gate-log.csv` (gitignored).
2. For each real Cursor/Claude/VS Code turn that *should* have gated, add a row.
3. After ≥20 rows, compute first-call rate:

```text
first_call_rate = count(outcome=called) / count(rows where expected=yes)
target ≥ 0.70
```

## Outcome values
| outcome | Meaning |
|---------|---------|
| `called` | Host called `optimize_and_blueprint_intent` on first response |
| `skipped` | Host answered/coded without the tool |
| `recovered` | Skipped first, then `/optimize` or “run the efficiency engine” recovered |

## Tips that raise rate
- PRIORITY 0 `.cursor/rules/00-promptmcp.mdc` installed (re-run `init` after rule updates)
- Agent mode with MCP tools enabled (not plain chat)
- Lead prompts with `@promptmcp:include` when models skim
- Explicit `/optimize` when a skip is noticed
- Run `agent-efficiency-mcp doctor --project .`
- Summarize: `npm run dogfood-summary`
