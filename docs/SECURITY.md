# Security

## Secrets
- Never commit `.env`, API keys, or tokens.
- Use `.env.example` placeholders only.
- Prefer MCP `env` in your local IDE config for keys (not checked into projects).
- If a key was ever pasted into chat, committed, or logged → **rotate it** at the provider.

## Trust boundary
- The engine runs **locally** on your machine.
- Rewrites are sent only to the **LLM provider you configure** (or your local/LAN endpoint).
- We do not operate a cloud that stores your prompts.
- Forced file/media paths are confined under `workspace_root` (no `..` escape).
- Optional URL enrichment (`PROMPT_MCP_FETCH_URLS=1`, default on) fetches public page titles/snippets for `@promptmcp:search` only. Private / link-local / metadata hosts are blocked. Disable with `PROMPT_MCP_FETCH_URLS=0`.
- Media vision (`PROMPT_MCP_VISION=1`) reads image bytes from the workspace and may send them to your vision-capable provider.

## Supply chain
- Dependencies are minimal (`@modelcontextprotocol/sdk`, `dotenv`, `zod`).
- Review `package-lock.json` before publish.
- Prefer `npm ci` in CI.

## Reporting
See root [SECURITY.md](../SECURITY.md). Email **AgentEfficiencyMCP@gmail.com**. Do not file public issues with exploit details.
