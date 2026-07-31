# Install

Works with **Cursor** (default) and **VS Code / Copilot** (`--hosts vscode`). Other MCP hosts via `--hosts all` (see [HOSTS.md](./HOSTS.md)).

## Essential commands

Run these in your **app** directory:

```bash
npx agent-efficiency-mcp@latest init --project .
npx agent-efficiency-mcp@latest configure --project . --provider "<PROVIDER>" --api-key "<YOUR_KEY>" --model "<MODEL>"
npx agent-efficiency-mcp@latest doctor --project .
```

Examples:

```bash
npx agent-efficiency-mcp@latest configure --project . --provider deepseek --api-key "<YOUR_KEY>" --model flash
npx agent-efficiency-mcp@latest configure --project . --provider openai --api-key "<YOUR_KEY>" --model gpt-4.1-mini
npx agent-efficiency-mcp@latest configure --project . --provider anthropic --api-key "<YOUR_KEY>" --model "sonnet 4"
```

1. Reload MCP or restart the IDE.
2. Confirm `agent-efficiency-engine` is connected.
3. Send a prompt, review `Agent_Efficiency_MCP.md`, type **`GO`**.

| Step | What happens |
|------|----------------|
| `init` | Project MCP entry, PRIORITY 0 rules, blueprint stub |
| `configure` | Key + model in MCP `env` (gitignored IDE config) |
| `doctor` | Checks build, rules, MCP registration, and key presence |
| Reload | Host starts the server with that env |
| Prompt → GO | Rewrite, freeze, you approve, agent executes |
| Skip | `/optimize` or `run the efficiency engine` |

`configure` only writes the MCP server `env` block. No project-root `.env` is required for the npx path.

### Cursor vs VS Code

```bash
# Cursor (default): .cursor/mcp.json
npx agent-efficiency-mcp@latest init --project .

# VS Code / Copilot: .vscode/mcp.json
npx agent-efficiency-mcp@latest init --project . --hosts vscode
npx agent-efficiency-mcp@latest configure --project . --hosts vscode --provider "<PROVIDER>" --api-key "<YOUR_KEY>" --model "<MODEL>"
```

## Build from a clone

```bash
git clone https://github.com/Agent-Efficiency-MCP/Agent-Efficiency-MCP.git
cd Agent-Efficiency-MCP
npm install
cp .env.example .env
# Edit .env and set one provider key (this package only)
npm run build

npx agent-efficiency-mcp init --project "C:/path/to/your/app"
```

What `init` does:

1. Merges the MCP server into project IDE config (Cursor by default at `./.cursor/mcp.json`). Other MCP servers are left alone. Use `--also-global` for `~/.cursor/mcp.json`, or `--hosts vscode` / `--hosts all` for other IDEs.
2. Adds `.cursor/rules/00-promptmcp.mdc` without deleting other rules. Upserts a marked block into `.cursorrules` or `AGENTS.md` when those files already exist. VS Code also gets a Copilot instructions upsert when `--hosts vscode` or `all`.
3. Creates `Agent_Efficiency_MCP.md` if missing.
4. Prints absolute paths for the blueprint and every file it touched.

Reload MCP after `init` or `configure`.

```bash
npx agent-efficiency-mcp doctor --project "C:/path/to/your/app"
```

`doctor` checks process env and MCP `mcp.json` (project and global). A healthy npx install is not a FAIL just because the CLI shell has no key.

```bash
npx agent-efficiency-mcp uninstall --project "C:/path/to/your/app"
# keep rules: add --keep-rules
```

### Init flags

| Flag | Meaning |
|------|---------|
| `--project <dir>` | Target project root (default: cwd) |
| `--also-global` | Also register `~/.cursor/mcp.json` |
| `--global-only` | Only global Cursor MCP |
| `--skip-hosts` | Do not write MCP JSON |
| `--skip-rules` | Do not merge rules |
| `--skip-blueprint` | Do not create `Agent_Efficiency_MCP.md` |
| `--hosts auto\|cursor\|vscode\|all` | IDE family (default: Cursor project) |
| `--launch node\|npx` | `node` = absolute CLI path. `npx` survives moves (auto for cache installs) |
| `--env KEY=VAL` | Extra MCP server env (repeatable) |

### If the host skips the gate

Type `/optimize` or say **run the efficiency engine**, then confirm the MCP server is connected.

### API key and model

We do **not** create or edit your app `.env`. Putting rewrite keys next to app secrets is easy to leak and hard to audit.

Keys go in the MCP server `env` inside IDE config (`mcp.json`), on the `agent-efficiency-engine` entry only:

```bash
npx agent-efficiency-mcp configure --project . --provider "<PROVIDER>" --api-key "<YOUR_KEY>" --model "<MODEL>"
# optional: --effort none|low|medium|high|max --thinking on|off --max-tokens 8192 --also-global
```

Notes:

- Default hosts (`--hosts auto`): Cursor project only. Add `--also-global` for home Cursor. Use `--hosts vscode` or `--hosts all` for other IDEs.
- Prefer re-running `configure` over hand-editing JSON. If a global Cursor entry already exists, `configure` syncs keys there too.
- Flash-class models default to thinking off. Use `--effort high` or `--thinking on` for heavier rewrites.
- `init` / `configure` add project mcp.json paths to `.gitignore`.
- Consumer `npx … init` defaults to `--launch npx` so the MCP entry does not pin a disposable npm-cache path.
- Provider and model names are flexible (`Deep Seek`, `flash`, `pro:max`, or exact API ids).
- You can also pass `--env DEEPSEEK_API_KEY=...` at init, or edit the IDE MCP server env UI.
- Optional helper: [Code Graph](https://www.npmjs.com/package/@sdsrs/code-graph) as a separate MCP. Not required.

Package clones may use this repo’s own `.env` (see `.env.example`). That file is for developing Agent Efficiency, not for consumer apps. Old `.agent_intent.md` files are unused and safe to delete.

### Uninstall

```bash
npx agent-efficiency-mcp uninstall --project .
npx agent-efficiency-mcp uninstall --project . --purge
```

Removes the `agent-efficiency-engine` MCP entry (including env keys) and PRIORITY 0 rules. With `--purge`, also deletes `Agent_Efficiency_MCP.md`, `.promptmcp/`, and empty mcp.json husks. Does not touch your app `.env`, `README.md`, or other MCP servers. Needs package **≥1.4.2** (`--purge` was ignored on 1.4.0).

## Manual install

Point your host at `node /absolute/path/to/Agent-Efficiency-MCP/dist/server.js`.

Default blueprint name: `Agent_Efficiency_MCP.md` (override with `PROMPT_MCP_BLUEPRINT`).
