# Install

## Consumer install (npm — recommended)

```bash
cd /path/to/your/app
npx agent-efficiency-mcp@latest init --project .
npx agent-efficiency-mcp@latest configure --project . --provider deepseek --api-key YOUR_KEY --model flash
# reload MCP / restart IDE
npx agent-efficiency-mcp@latest doctor --project .
```

`configure` writes the key into the MCP server `env` block in your IDE config (Cursor/VS Code/…).  
There is **no** project-root `.env` required for the npx consumer path.

## Contributor / local clone

```bash
git clone https://github.com/Agent-Efficiency-MCP/Agent-Efficiency-MCP.git
cd Agent-Efficiency-MCP
npm install
cp .env.example .env
# Edit .env — set at least one provider key
npm run build

npx agent-efficiency-mcp init --project "C:/path/to/your/app"
```

`init` will:

1. **Merge** MCP server config into Cursor, VS Code, Windsurf, Claude Desktop, Claude Code (and other hosts if detected) — **does not remove** your other MCP servers
2. **Add** PRIORITY 0 rules as `.cursor/rules/00-promptmcp.mdc` without deleting other rule files; upserts a marked block into existing `.cursorrules` / `AGENTS.md` if present
3. **Create** `Agent_Efficiency_MCP.md` at the project root (skipped if it already exists)
4. Print the **absolute path** of the blueprint file and every config/rules path touched

Restart your IDE / reload MCP after init / configure.

Health check anytime:

```bash
npx agent-efficiency-mcp doctor --project "C:/path/to/your/app"
```

Uninstall (removes MCP entry + PRIORITY 0 rules; keeps other servers/rules):

```bash
npx agent-efficiency-mcp uninstall --project "C:/path/to/your/app"
# keep rules: add --keep-rules
```

### Init flags

| Flag | Meaning |
|------|---------|
| `--project <dir>` | Target project root (default: cwd) |
| `--global-only` | Only global IDE configs |
| `--skip-hosts` | Do not write MCP JSON |
| `--skip-rules` | Do not merge rules |
| `--skip-blueprint` | Do not create `Agent_Efficiency_MCP.md` |
| `--launch node\|npx` | `node` = absolute CLI path (default); `npx` = resilient after moves |
| `--env KEY=VAL` | Inject into MCP server `env` (repeatable) |

### If the host skips the gate
Type `/optimize` or say **run the efficiency engine**, then confirm MCP is connected.

### API key / model

**Preferred (consumers):**

```bash
npx agent-efficiency-mcp configure --project . --provider deepseek --api-key YOUR_KEY --model flash
```

Also accepted at init time: `--env DEEPSEEK_API_KEY=...` (repeatable).  
Or edit the MCP server’s **env** fields in Cursor Settings → MCP.  
Local clone contributors may still use the package `.env` (see `.env.example`).

## Manual install

Point your host at `node /absolute/path/to/Agent-Efficiency-MCP/dist/server.js`.

Blueprint filename default: `Agent_Efficiency_MCP.md` (override with `PROMPT_MCP_BLUEPRINT`).
