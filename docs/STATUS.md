# Status

**Last updated:** 2026-07-31  
**Version target:** **1.4.8** (launch pack)  
**Direction:** **Open-source · local-only · BYOK** (AGPL-3.0-only + commercial dual-license)

## Launch readiness
**Ship-quality for Cursor.** Soft gate cannot force tool calls — recovery phrases work.

Verified product loop (Cursor / Guardian dogfood):
- Messy-prompt round ~**9.0/10** (gate, freeze, GO, ignore/help/file/scope)
- HQ-prompt round ~**8.4/10** → polish in 1.4.7 (false paths, depth, analysis-only verify)
- Offline CI: unit/contract/stdio/CLI + smoke:offline + mock eval + flake + auto-dogfood

## One-page install (Cursor)
```bash
npx agent-efficiency-mcp@latest init --project .
npx agent-efficiency-mcp@latest configure --project . --provider "Deep Seek" --api-key "<KEY>" --model flash
# Reload MCP → send a prompt → review Agent_Efficiency_MCP.md → type GO
# Skip recovery: /optimize  or  "run the efficiency engine"
npx agent-efficiency-mcp@latest doctor --project .
```

Defaults: **project** `.cursor/mcp.json` only · flash-class **thinking off** · keys never in app `.env`.

## Shipped
- npm **1.4.8** + public GitHub
- Final Cursor quality pass (gate / freeze / GO / analysis-only) — good enough

## Nice later (not blocking)
- Personal dogfood CSV n≥20 ([DOGFOOD_GATE.md](./DOGFOOD_GATE.md))
- VS Code smoke ([HOSTS.md](./HOSTS.md))
- Freeze UX: short clarifications without re-optimize
- Real demo capture to replace storyboard GIF if desired
- Rotate any keys that ever appeared in chat logs (hygiene)

## Origin
https://share.google/aimode/OvN5swZbE704L26KA
