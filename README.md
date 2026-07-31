# Agent Efficiency Engine (MCP)

Local MCP for **Cursor**, **VS Code / Copilot**, and other MCP hosts. You bring your own API key (or a local model).

When you send a task, the host should call this engine first. It rewrites your prompt into a clear engineering brief in `Agent_Efficiency_MCP.md`, then the coding agent **stops** until you type **`GO`**. That pause is the point: you review the plan (and can edit the file) before anything gets implemented.

Rewrites go only to the LLM API you configure. Nothing is sent to a PromptMCP cloud.

npm [`agent-efficiency-mcp`](https://www.npmjs.com/package/agent-efficiency-mcp) · [Install](docs/INSTALL.md) · [Hosts](docs/HOSTS.md) · [Privacy](docs/PRIVACY.md) · [Security](./SECURITY.md) · [AGPL-3.0](./LICENSE) · [Commercial](docs/COMMERCIAL.md)

---

## Install

Run these in your **app** folder (not this repo):

```bash
npx agent-efficiency-mcp@latest init --project .
npx agent-efficiency-mcp@latest configure --project . --provider "<PROVIDER>" --api-key "<YOUR_KEY>" --model "<MODEL>"
npx agent-efficiency-mcp@latest doctor --project .
```

Examples:

```bash
# DeepSeek (cheap to try)
npx agent-efficiency-mcp@latest configure --project . --provider deepseek --api-key "<YOUR_KEY>" --model flash

# OpenAI / Anthropic / Gemini / xAI / local
npx agent-efficiency-mcp@latest configure --project . --provider openai --api-key "<YOUR_KEY>" --model gpt-4.1-mini
```

Then:

1. Reload MCP in your IDE (or restart the IDE).
2. Confirm `agent-efficiency-engine` is connected.
3. Send a task → open `Agent_Efficiency_MCP.md` → type **`GO`** when it looks right.

| Command | What it does |
|---------|----------------|
| `init` | Registers project MCP + PRIORITY 0 rules + blueprint stub |
| `configure` | Writes provider + key into IDE MCP config (gitignored) |
| `doctor` | Checks that install and keys look ready |

**Default IDE:** Cursor project config (`.cursor/mcp.json`).  
**VS Code / Copilot:** `init --project . --hosts vscode` (writes `.vscode/mcp.json`).  
**Also global Cursor:** add `--also-global`.  
**Several hosts:** `--hosts all`.

Keys live in the MCP server `env` block. They are **not** written to your app `.env`.

If the agent skips the gate, type `/optimize` or say `run the efficiency engine`.  
To skip the gate for one message: `@promptmcp:ignore your question here`.

More detail: [docs/INSTALL.md](docs/INSTALL.md) · Fixes: [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

---

## How it works

Coding agents are eager. Give them a vague ask and they start editing before the goal is clear. This tool inserts a review step in the middle.

1. You type a messy (or precise) task in Agent mode.
2. The host calls `optimize_and_blueprint_intent` with your exact text and the project root.
3. The engine gathers light workspace context, calls **your** rewrite model, and writes `Agent_Efficiency_MCP.md` (objective, boundaries, files to touch, verification).
4. The agent prints a freeze line and waits. No coding yet.
5. You read the blueprint. Edit the markdown if you want. When it matches your intent, type **`GO`**.
6. The agent executes from that blueprint only.

You still use Cursor or VS Code as usual. This is an MCP layer on top, not a separate IDE.

![PromptMCP demo: blueprint freeze awaiting GO](docs/assets/demo.png)

---

## Directives (optional tags in chat)

Prefixes (same meaning): `@promptmcp:` · `@mcp:` · `@ourmcp:`

| Tag | What it does |
|-----|----------------|
| `ignore` | Skip the engine for this message; answer normally |
| `include` | Keep your original wording under `## Original Prompt` |
| `file[a.ts, b.ts]` | Force those paths into the blueprint |
| `media[img.png]` | Force media the agent should open after `GO` |
| `search[https://…]` | Force research URLs after `GO` (optional note on the same line) |
| `scope[src/]` | Focus context gathering under path prefixes |
| `long` | Deeper multi-phase worklist |
| `short` | Tight single-pass compression |
| `test` | Require tests in requirements + verification |
| `tone` | Keep emphatic priority cues (“do NOT break prod”) |
| `diff` | Prefer current git-changed files |
| `strict` | Never drop your cited paths / media / URLs |
| `help` | Print the cheat-sheet (no freeze if the message is only help) |

Examples:

```text
@promptmcp:ignore what does this function do?

@promptmcp:file[src/server.ts] @promptmcp:test
Harden error handling in the MCP server.

@promptmcp:help
```

Full guide: [docs/DIRECTIVES.md](docs/DIRECTIVES.md).

---

## Useful CLI extras

```bash
# Cursor project + ~/.cursor/mcp.json
npx agent-efficiency-mcp@latest init --project . --also-global

# VS Code / Copilot
npx agent-efficiency-mcp@latest init --project . --hosts vscode
npx agent-efficiency-mcp@latest configure --project . --hosts vscode --provider "<PROVIDER>" --api-key "<YOUR_KEY>" --model "<MODEL>"

# Remove from a project
npx agent-efficiency-mcp@latest uninstall --project . --purge
```

Providers: `deepseek` · `openai` · `anthropic` · `gemini` · `xai` · `local` · `openai_compat` · `auto`  
See `.env.example` and [docs/ENGINE.md](docs/ENGINE.md).

---

## Develop this package

```bash
git clone https://github.com/Agent-Efficiency-MCP/Agent-Efficiency-MCP.git
cd Agent-Efficiency-MCP
npm install && npm run build
npm test
```

Proprietary licensing: **AgentEfficiencyMCP@gmail.com**
