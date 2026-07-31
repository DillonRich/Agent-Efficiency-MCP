# Agent Efficiency Engine (MCP)

Local MCP for Cursor. You bring your own API key. Messy prompts become a dense blueprint in `Agent_Efficiency_MCP.md`. The coding agent stops until you type `GO`.

Everything runs on your machine. The rewrite call goes only to the LLM API (or local model) you configure.

npm [`agent-efficiency-mcp`](https://www.npmjs.com/package/agent-efficiency-mcp) · [Install](docs/INSTALL.md) · [Privacy](docs/PRIVACY.md) · [Security](./SECURITY.md) · [AGPL-3.0](./LICENSE) · [Commercial](docs/COMMERCIAL.md)

---

## Install

Run these in your **app** folder (not this repo):

```bash
npx agent-efficiency-mcp@latest init --project .
npx agent-efficiency-mcp@latest configure --project . --provider deepseek --api-key YOUR_KEY --model flash
npx agent-efficiency-mcp@latest doctor --project .
```

1. Reload MCP in Cursor (or restart Cursor).
2. Confirm `agent-efficiency-engine` is connected.
3. Send a task, review `Agent_Efficiency_MCP.md`, type **`GO`**.

| Command | What it does |
|---------|----------------|
| `init` | Project MCP entry, PRIORITY 0 rules, blueprint stub |
| `configure` | Provider + key in `.cursor/mcp.json` (gitignored) |
| `doctor` | Checks install and whether a key is visible |

Keys stay in the MCP server `env` block. They are **not** written to your app `.env`.

DeepSeek with `--model flash` is a cheap default (thinking off). Same `configure` command works with `openai`, `anthropic`, `gemini`, `xai`, or `local`.

If the agent skips the gate, type `/optimize` or say `run the efficiency engine`.  
To skip the gate for one message: `@promptmcp:ignore your question here`.

More detail: [docs/INSTALL.md](docs/INSTALL.md). Fixes: [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

---

![PromptMCP demo](docs/assets/demo.gif)

## How it works

1. You send a task (messy or precise).
2. The host calls `optimize_and_blueprint_intent`.
3. The engine rewrites the intent and writes `Agent_Efficiency_MCP.md`.
4. The agent freezes until **`GO`**.
5. After `GO`, the agent follows that blueprint only.

## Optional commands

```bash
# Also register ~/.cursor/mcp.json
npx agent-efficiency-mcp@latest init --project . --also-global

# VS Code / Copilot project MCP
npx agent-efficiency-mcp@latest init --project . --hosts vscode

# Remove from a project
npx agent-efficiency-mcp@latest uninstall --project . --purge
```

Common directives: `@promptmcp:ignore`, `include`, `file[...]`, `media[...]`, `scope[...]`, `help`. Full list in [docs/DIRECTIVES.md](docs/DIRECTIVES.md).

## Develop this package

```bash
git clone https://github.com/Agent-Efficiency-MCP/Agent-Efficiency-MCP.git
cd Agent-Efficiency-MCP
npm install && npm run build
npm test
```

Proprietary licensing: **AgentEfficiencyMCP@gmail.com**
