# Troubleshooting

## MCP server not connected
1. `npm run build` in the package root
2. Re-run `npx agent-efficiency-mcp init --project <app>`
3. Restart IDE / reload MCP
4. `npx agent-efficiency-mcp doctor --project <app>`

## Host skipped the gate (answered without freezing)
Expected soft-limit of MCP hosts. Recovery:
- Type `/optimize` or **run the efficiency engine**
- Confirm Agent mode has tools enabled
- Re-install PRIORITY 0 rules via `init` (does not wipe other rules)

## Auth / 401 / 403
- Check package `.env` or MCP `env` for the provider key
- After repeated failures the **auth circuit** opens (~2 minutes) — fix the key, wait, or restart MCP
- `agent-efficiency-mcp doctor` lists whether a key is visible to the process

## Rate limit 429
- Wait / switch model / provider
- Engine retries 429/5xx with backoff (`PROMPT_MCP_HTTP_RETRIES`)

## Blueprint path wrong
- Always pass absolute `workspace_root`
- Or set `PROMPT_MCP_WORKSPACE`
- Filename override: `PROMPT_MCP_BLUEPRINT`

## Absolute `node …/dist/cli.js` broke after move
```bash
npx agent-efficiency-mcp init --project . --launch npx
```

## Uninstall
```bash
npx agent-efficiency-mcp uninstall --project .
# keep rules: --keep-rules
```

## Quality regressions
```bash
npm run quality-loop
npm run eval:mock
npm run flake-check
```
See [IMPROVEMENT_PROGRAM.md](./IMPROVEMENT_PROGRAM.md) and [SCORECARD.md](./SCORECARD.md).
