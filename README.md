# Agent Efficiency Engine (MCP)

**Local BYOK MCP** that turns messy IDE prompts into dense engineering blueprints, writes `Agent_Efficiency_MCP.md`, and freezes the coding agent until you type **`GO`**.

Bring your own API key (or a fully local LLM). Runs on your machine. No cloud subscription for this tool.

[AGPL-3.0](./LICENSE) · [Commercial licensing](docs/COMMERCIAL.md) · [Security](./SECURITY.md) · [Privacy](docs/PRIVACY.md) · [Directives](docs/DIRECTIVES.md)

npm: [`agent-efficiency-mcp`](https://www.npmjs.com/package/agent-efficiency-mcp) · GitHub: [Agent-Efficiency-MCP/Agent-Efficiency-MCP](https://github.com/Agent-Efficiency-MCP/Agent-Efficiency-MCP)

![PromptMCP demo](docs/assets/demo.gif)

## Why
Serious builders already pay for Cursor / Claude / Copilot. This adds a **pause-and-approve** efficiency layer — rewrite the intent, review it, then execute — without another mandatory SaaS fee, and without sending prompts through *our* servers.

**Privacy:** Rewrites go only to *your* chosen LLM API or local model. See [PRIVACY.md](docs/PRIVACY.md).

## Quick start

```bash
# After npm publish (preferred):
npx agent-efficiency-mcp@latest init --project "C:/path/to/your/app"
npx agent-efficiency-mcp@latest configure --project "C:/path/to/your/app" --provider deepseek --api-key YOUR_KEY --model flash
# Keys go in MCP mcp.json env (not your app's .env)

# Or from a local clone:
git clone https://github.com/Agent-Efficiency-MCP/Agent-Efficiency-MCP.git
cd Agent-Efficiency-MCP
npm install
cp .env.example .env
# Add one provider key (DeepSeek is cheap to try) or configure LOCAL_LLM_*
npm run build
npx agent-efficiency-mcp init --project "C:/path/to/your/app"

# Health check
npx agent-efficiency-mcp doctor --project "C:/path/to/your/app"
```

Restart your IDE / reload MCP. Details: [docs/INSTALL.md](docs/INSTALL.md).

### If the model skips the gate
Host models can ignore tools. Recovery:
1. Type `/optimize`, or say **“run the efficiency engine”**, **“call PromptMCP”**, or **“gate this prompt”**
2. Lead the next task with `@promptmcp:include` so the tag is hard to miss
3. Confirm `agent-efficiency-engine` is connected in MCP settings
4. Run `agent-efficiency-mcp doctor --project .`

## Loop
1. You type a messy task (optionally with `@promptmcp:` directives)
2. Host calls `optimize_and_blueprint_intent`
3. Engine rewrites → writes `Agent_Efficiency_MCP.md` (prior copy archived under `.promptmcp/history/`)
4. Agent freezes until you type **`GO`**
5. Agent executes from the blueprint only

## Directives
`@promptmcp:ignore` · `include` · `file[...]` · `media[...]` · `scope[...]` · `search[...]` · `long` · `short` · `test` · `tone` · `diff` · `strict` · `help`  
Aliases: `@mcp:` · `@ourmcp:`  
Full guide: [docs/DIRECTIVES.md](docs/DIRECTIVES.md)

**Media vision:** `@promptmcp:media[mockups/hero.png]` attaches images to vision-capable providers (OpenAI, Anthropic, Gemini, xAI, local/compat). DeepSeek keeps path forcing for post-`GO` IDE inspection.

## Providers
`auto` · `deepseek` · `openai` · `anthropic` · `gemini` · `xai` · `local` · `openai_compat`  
See `.env.example`.

## Install launch modes
| Mode | Command | When |
|------|---------|------|
| `node` (default) | absolute `dist/cli.js serve` | Local clone |
| `npx` | `npx -y agent-efficiency-mcp serve` | After npm publish; survives moves |

```bash
npx agent-efficiency-mcp init --project . --launch npx
```

## License
**AGPL-3.0-only** — open community use with share-alike obligations.  
For **closed-source / proprietary** use, contact **AgentEfficiencyMCP@gmail.com** — see [docs/COMMERCIAL.md](docs/COMMERCIAL.md).

## Develop
```bash
npm install && npm run build
npm test
npm run smoke          # offline CI uses PROMPT_MCP_SMOKE_OFFLINE=1
npm run eval:mock      # CI rewrite eval (no API key)
npm run doctor
npm run quality-loop   # offline gates + mock eval + trend
```

Troubleshooting: [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) · Uninstall: `npx agent-efficiency-mcp uninstall --project . --purge`

## Sponsors
GitHub Sponsors will be enabled when the project goes public — thank you for supporting independent tools.
