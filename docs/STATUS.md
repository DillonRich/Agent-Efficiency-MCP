# Status

**Updated:** 2026-07-31  
**Version:** 1.4.8  
**Direction:** Open source, local-only, BYOK (AGPL-3.0-only + commercial dual-license)

## Ready for Cursor
Ship quality for the Cursor loop. The soft gate cannot force tool calls. Recovery phrases work.

Checked:

- Messy-prompt dogfood ~9.0/10 (gate, freeze, GO, ignore/help/file/scope)
- HQ-prompt dogfood ~8.4/10, then 1.4.7 polish (false paths, depth, analysis-only verify)
- Offline CI: unit/contract/stdio/CLI, smoke:offline, mock eval, flake, auto-dogfood

## Install

```bash
npx agent-efficiency-mcp@latest init --project .
npx agent-efficiency-mcp@latest configure --project . --provider deepseek --api-key YOUR_KEY --model flash
# Reload MCP, send a prompt, review Agent_Efficiency_MCP.md, type GO
# If skipped: /optimize  or  run the efficiency engine
npx agent-efficiency-mcp@latest doctor --project .
```

Defaults: project `.cursor/mcp.json` only, flash thinking off, keys not in app `.env`.

## Shipped
- npm 1.4.8 and public GitHub
- Final Cursor quality pass (gate / freeze / GO / analysis-only)

## Later (not blocking)
- Personal dogfood CSV n≥20 ([DOGFOOD_GATE.md](./DOGFOOD_GATE.md))
- VS Code smoke ([HOSTS.md](./HOSTS.md))
- Freeze UX for short clarifications without re-optimize
- Real demo capture instead of the storyboard GIF
- Rotate keys that ever appeared in chat logs

## Origin
https://share.google/aimode/OvN5swZbE704L26KA
