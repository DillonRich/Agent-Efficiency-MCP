# Hosts

`npx agent-efficiency-mcp init` merges our MCP server and leaves your other servers alone.

**Default (`--hosts auto`):** Cursor project only (`.cursor/mcp.json`).  
Add `~/.cursor/mcp.json` with `--also-global`. Use `--hosts all` or `--hosts vscode` for other IDEs.

| Host | Config path(s) | Root key | Rules / guidance |
|------|----------------|----------|------------------|
| Cursor | `.cursor/mcp.json` (default). `~/.cursor/mcp.json` with `--also-global` | `mcpServers` | `.cursor/rules/00-promptmcp.mdc` + `templates/hosts/cursor.md` |
| VS Code Copilot | `.vscode/mcp.json` (`--hosts vscode` or `all`) | `servers` | `.github/copilot-instructions.md` upsert + `hosts/vscode-copilot.md` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json`, `~/.windsurf/mcp.json` | `mcpServers` | `hosts/windsurf.md` (best-effort, `--hosts all`) |
| Claude Desktop | `%APPDATA%/Claude/claude_desktop_config.json` (Win) / Application Support (Mac) | `mcpServers` | `hosts/claude.md` |
| Claude Code | `~/.claude/settings.json` | `mcpServers` | `hosts/claude.md` |
| Cline / Continue | project paths under `.cline` / `.continue` | `mcpServers` | Cursor-style PRIORITY 0 text |

After init, restart the IDE or reload MCP. Blueprint: `Agent_Efficiency_MCP.md` (absolute path printed by init).

## VS Code smoke

Cursor is the main target. Quick VS Code check:

1. `npx agent-efficiency-mcp init --project . --hosts vscode`
2. `npx agent-efficiency-mcp configure --project . --hosts vscode --provider … --api-key … --model flash`
3. Reload the window. Confirm `agent-efficiency-engine` under MCP / Copilot tools.
4. In Agent mode, send a messy task. Expect `optimize_and_blueprint_intent`, then freeze, then `GO`.
5. If skipped: `run the efficiency engine` or `@promptmcp:include`.

See [INSTALL.md](./INSTALL.md), [QUALITY.md](./QUALITY.md), [DOGFOOD_GATE.md](./DOGFOOD_GATE.md).
