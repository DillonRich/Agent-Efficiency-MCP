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

### API key / model (security model)

**We do not create or edit your app’s `.env`.** Mixing rewrite keys into an application secrets file is risky and surprising.

Keys go in the **MCP server `env` block** inside IDE config (`mcp.json`) — scoped to the PromptMCP server entry only:

```bash
npx agent-efficiency-mcp configure --project . --provider "<PROVIDER>" --api-key "<YOUR_KEY>" --model "<MODEL>"
# optional: --effort none|low|medium|high|max --thinking on|off --max-tokens 8192
```

- Default hosts (`--hosts auto`): **Cursor only**. Use `--hosts all` if you also want VS Code / other IDE project configs
- Keys / model live in the MCP server `env` block. After `init`, Cursor usually has **two** copies:
  1. Project: `<your-app>/.cursor/mcp.json`
  2. Global: `~/.cursor/mcp.json` (Windows: `C:\Users\<you>\.cursor\mcp.json`)
- **Best practice to change provider / model / key:** re-run `configure` (it syncs both when our server is registered). Hand-editing only one file can leave the other stale and the MCP process may use the empty one.
- If you edit JSON by hand, update **both** files’ `agent-efficiency-engine.env` (or disable the global entry), then reload MCP.
- `configure` / `init` add project mcp.json paths to `.gitignore`
- Consumer `npx … init` defaults to `--launch npx` so MCP does not pin a disposable npm-cache path
- Provider/model names are flexible (`Deep Seek`, `flash`, `pro:max`, exact API ids)
- `--model` / `--effort` / `--max-tokens` are sent on the rewrite API call (they affect which model and thinking mode run)
- Also accepted at init: `--env DEEPSEEK_API_KEY=...`
- Or edit Cursor Settings → MCP → server env UI
- Optional: [Code Graph](https://www.npmjs.com/package/@sdsrs/code-graph) (or similar) as a **separate** MCP can improve repo mapping; it is **not** required — Agent Efficiency gathers its own context

Local **package clone** contributors may use the package’s own `.env` (see `.env.example`) — that is the Agent Efficiency repo, not the consumer app. Legacy `.agent_intent.md` files (old product name) are unused; safe to delete.

### Uninstall

```bash
npx agent-efficiency-mcp uninstall --project .
# full project cleanup (blueprint .md + entire .promptmcp/):
npx agent-efficiency-mcp uninstall --project . --purge
```

Removes the `agent-efficiency-engine` MCP entry (**including its env keys**), PRIORITY 0 rules, and with `--purge`: `Agent_Efficiency_MCP.md`, all of `.promptmcp/` (host tips + history), empty mcp.json husks. Does not touch your app `.env`, `README.md`, or other MCP servers. Requires package **≥1.4.2** (`--purge` is ignored on 1.4.0).

## Manual install

Point your host at `node /absolute/path/to/Agent-Efficiency-MCP/dist/server.js`.

Blueprint filename default: `Agent_Efficiency_MCP.md` (override with `PROMPT_MCP_BLUEPRINT`).
