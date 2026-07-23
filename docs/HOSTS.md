# Host install matrix

`npx promptmcp init` merges the MCP server without removing other servers.

| Host | Config path(s) | Root key | Rules / guidance |
|------|----------------|----------|------------------|
| Cursor | `~/.cursor/mcp.json`, `.cursor/mcp.json` | `mcpServers` | `.cursor/rules/00-promptmcp.mdc` + `templates/hosts/cursor.md` |
| VS Code Copilot | `.vscode/mcp.json` | `servers` | `.github/copilot-instructions.md` upsert + `hosts/vscode-copilot.md` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json`, `~/.windsurf/mcp.json` | `mcpServers` | `hosts/windsurf.md` |
| Claude Desktop | `%APPDATA%/Claude/claude_desktop_config.json` (Win) / Application Support (Mac) | `mcpServers` | `hosts/claude.md` |
| Claude Code | `~/.claude/settings.json` | `mcpServers` | `hosts/claude.md` |
| Cline / Continue | project paths under `.cline` / `.continue` | `mcpServers` | use Cursor-style PRIORITY 0 text |

After init, restart the IDE or reload MCP. Blueprint: `Agent_Efficiency_MCP.md` (absolute path printed by init).

See also: [INSTALL.md](./INSTALL.md), [QUALITY.md](./QUALITY.md).
