# Troubleshooting

## MCP server not connected
1. `npm run build` in the package root
2. Re-run `npx agent-efficiency-mcp init --project <app>`
3. Restart the IDE or reload MCP
4. `npx agent-efficiency-mcp doctor --project <app>`

## Host skipped the gate
Hosts can ignore tools. That is a soft limit of MCP.

- Type `/optimize` or **run the efficiency engine**
- Use Agent mode with tools enabled
- Re-run `init` to refresh PRIORITY 0 rules (other rules stay)

## Auth / 401 / 403
- Check package `.env` or MCP `env` for the provider key
- After repeated failures the auth circuit opens for about 2 minutes. Fix the key, wait, or restart MCP.
- `agent-efficiency-mcp doctor` shows whether a key is visible

## Rate limit 429
- Wait, switch model, or switch provider
- Engine retries 429/5xx with backoff (`PROMPT_MCP_HTTP_RETRIES`)

## Blueprint path wrong
- Pass an absolute `workspace_root`
- Or set `PROMPT_MCP_WORKSPACE`
- Filename override: `PROMPT_MCP_BLUEPRINT`

## Absolute `node …/dist/cli.js` broke after a move

```bash
npx agent-efficiency-mcp init --project . --launch npx
```

## Uninstall

```bash
npx agent-efficiency-mcp uninstall --project . --purge
# keep rules: --keep-rules
```

## Quality regressions

```bash
npm run quality-loop
npm run eval:mock
npm run flake-check
```

See [EVAL.md](./EVAL.md).
