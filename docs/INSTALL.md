# Install

## Essential commands (Cursor)

Run these in **your app** directory:

```bash
npx agent-efficiency-mcp@latest init --project .
npx agent-efficiency-mcp@latest configure --project . --provider deepseek --api-key YOUR_KEY --model flash
npx agent-efficiency-mcp@latest doctor --project .
```

1. Reload MCP / restart Cursor  
2. Confirm `agent-efficiency-engine` is connected  
3. Send a prompt → review `Agent_Efficiency_MCP.md` → type **`GO`**

| Step | What happens |
|------|----------------|
| `init` | Project Cursor MCP + PRIORITY 0 rules + blueprint stub |
| `configure` | BYOK key + model into MCP `env` (gitignored `.cursor/mcp.json`) |
| `doctor` | Confirms build/rules/MCP registration + key presence |
| Reload | Host starts the server with those env vars |
| Prompt → GO | Rewrite → freeze → you approve → agent executes |
| Skip? | `/optimize` or “run the efficiency engine” |

`configure` writes the key into the MCP server `env` block only.  
There is **no** project-root `.env` required for the npx consumer path.

## Contributor / local clone

```bash
git clone https://github.com/Agent-Efficiency-MCP/Agent-Efficiency-MCP.git
cd Agent-Efficiency-MCP
npm install
cp .env.example .env
# Edit .env — set at least one provider key (package-local only)
npm run build

npx agent-efficiency-mcp init --project "C:/path/to/your/app"
```

`init` will:

1. **Merge** MCP server config into **project** Cursor (`./.cursor/mcp.json`) by default — **does not remove** your other MCP servers. Use `--also-global` for `~/.cursor/mcp.json`, or `--hosts all` / `--hosts vscode` for other IDEs
2. **Add** PRIORITY 0 rules as `.cursor/rules/00-promptmcp.mdc` without deleting other rule files; upserts a marked block into existing `.cursorrules` / `AGENTS.md` if present
3. **Create** `Agent_Efficiency_MCP.md` at the project root (skipped if it already exists)
4. Print the **absolute path** of the blueprint file and every config/rules path touched

Restart your IDE / reload MCP after init / configure.

Health check anytime:

```bash
npx agent-efficiency-mcp doctor --project "C:/path/to/your/app"
```

`doctor` reads provider keys from **process env** and from **MCP mcp.json** (project + global), so a healthy npx install is not a false FAIL just because the CLI process has no key.

Uninstall (removes MCP entry + PRIORITY 0 rules; keeps other servers/rules):

```bash
npx agent-efficiency-mcp uninstall --project "C:/path/to/your/app"
# keep rules: add --keep-rules
```

### Init flags

| Flag | Meaning |
|------|---------|
| `--project <dir>` | Target project root (default: cwd) |
| `--also-global` | Also register `~/.cursor/mcp.json` (default: project only) |
| `--global-only` | Only global Cursor MCP |
| `--skip-hosts` | Do not write MCP JSON |
| `--skip-rules` | Do not merge rules |
| `--skip-blueprint` | Do not create `Agent_Efficiency_MCP.md` |
| `--hosts auto\|cursor\|vscode\|all` | Which IDE family (default: Cursor project) |
| `--launch node\|npx` | `node` = absolute CLI path; `npx` = resilient after moves (auto for cache installs) |
| `--env KEY=VAL` | Inject into MCP server `env` (repeatable) |

### If the host skips the gate
Type `/optimize` or say **run the efficiency engine**, then confirm MCP is connected.

### API key / model (security model)

**We do not create or edit your app’s `.env`.** Mixing rewrite keys into an application secrets file is risky and surprising.

Keys go in the **MCP server `env` block** inside IDE config (`mcp.json`) — scoped to the PromptMCP server entry only:

```bash
npx agent-efficiency-mcp configure --project . --provider "<PROVIDER>" --api-key "<YOUR_KEY>" --model "<MODEL>"
# optional: --effort none|low|medium|high|max --thinking on|off --max-tokens 8192 --also-global
```

- Default hosts (`--hosts auto`): **Cursor project** only. `--also-global` for home Cursor; `--hosts vscode` or `--hosts all` for other IDEs
- Keys / model live in the MCP server `env` block. Prefer re-running `configure` (it also syncs global **if** our server is already registered there)
- Flash-class models default to **thinking off** (cheaper/faster). Use `--effort high` or `--thinking on` when you want more rewrite compute
- `configure` / `init` add project mcp.json paths to `.gitignore`
- Consumer `npx … init` defaults to `--launch npx` so MCP does not pin a disposable npm-cache path
- Provider/model names are flexible (`Deep Seek`, `flash`, `pro:max`, exact API ids)
- Also accepted at init: `--env DEEPSEEK_API_KEY=...`
- Or edit Cursor Settings → MCP → server env UI
- Optional: [Code Graph](https://www.npmjs.com/package/@sdsrs/code-graph) (or similar) as a **separate** MCP can improve repo mapping; it is **not** required

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
