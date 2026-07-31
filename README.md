# Agent Efficiency Engine (MCP)

Local **bring-your-own-key** MCP for Cursor: messy prompts → dense blueprint in `Agent_Efficiency_MCP.md` → agent **freezes until you type `GO`**.

Runs on your machine. Rewrites go only to *your* LLM API (or a local model). No PromptMCP cloud.

npm [`agent-efficiency-mcp`](https://www.npmjs.com/package/agent-efficiency-mcp) · [Install](docs/INSTALL.md) · [Privacy](docs/PRIVACY.md) · [Security](./SECURITY.md) · [AGPL-3.0](./LICENSE) · [Commercial](docs/COMMERCIAL.md)

---

## Install (copy / paste)

From your **app** folder (not this repo):

```bash
npx agent-efficiency-mcp@latest init --project .
npx agent-efficiency-mcp@latest configure --project . --provider deepseek --api-key YOUR_KEY --model flash
npx agent-efficiency-mcp@latest doctor --project .
```

Then:

1. **Reload MCP** in Cursor (or restart Cursor)
2. Confirm `agent-efficiency-engine` is connected
3. Send a task → review `Agent_Efficiency_MCP.md` → type **`GO`**

| Command | What it does |
|---------|----------------|
| `init` | Registers project MCP + PRIORITY 0 rules + blueprint stub |
| `configure` | Writes provider + key into `.cursor/mcp.json` (gitignored) |
| `doctor` | Checks that install + keys look ready |

**Keys never go in your app’s `.env`.** They live only in the MCP server `env` block.

**Cheap try:** DeepSeek + `--model flash` (thinking off by default).  
Other providers: `openai` · `anthropic` · `gemini` · `xai` · `local` — same `configure` shape with `--provider` / `--model`.

**If the agent skips the gate:** type `/optimize` or say `run the efficiency engine`.  
**Bypass for one message:** `@promptmcp:ignore your question here`

Full detail: [docs/INSTALL.md](docs/INSTALL.md) · Troubleshooting: [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

---

![PromptMCP demo](docs/assets/demo.gif)

## How it works
1. You send a messy (or precise) task
2. Host calls `optimize_and_blueprint_intent`
3. Engine rewrites → writes `Agent_Efficiency_MCP.md`
4. Agent freezes until **`GO`**
5. Agent executes from that blueprint only

## Useful extras

```bash
# Also register ~/.cursor/mcp.json (optional)
npx agent-efficiency-mcp@latest init --project . --also-global

# VS Code / Copilot project MCP
npx agent-efficiency-mcp@latest init --project . --hosts vscode

# Remove from a project
npx agent-efficiency-mcp@latest uninstall --project . --purge
```

Directives: `@promptmcp:ignore` · `include` · `file[...]` · `media[...]` · `scope[...]` · `help` — see [docs/DIRECTIVES.md](docs/DIRECTIVES.md).

## Develop this package
```bash
git clone https://github.com/Agent-Efficiency-MCP/Agent-Efficiency-MCP.git
cd Agent-Efficiency-MCP
npm install && npm run build
npm test
```

Contact for proprietary licensing: **AgentEfficiencyMCP@gmail.com**
