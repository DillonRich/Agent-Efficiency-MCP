# Security Policy

## Supported versions
Security fixes are applied to the latest release of `agent-efficiency-mcp` on GitHub / npm.

## Reporting a vulnerability
Email **AgentEfficiencyMCP@gmail.com** with subject `Security report — Agent Efficiency MCP`.

Please include:
- Affected version / commit
- Reproduction steps
- Impact assessment (data exposure, SSRF, path escape, etc.)

Do **not** open a public GitHub issue for unfixed vulnerabilities.

We aim to acknowledge reports within a few days.

## Design boundaries
- This tool is **local BYOK** — your prompts go to *your* chosen LLM API or local model, not our servers.
- Forced file/media paths are confined under `workspace_root`.
- URL enrichment blocks private/link-local targets by default (`PROMPT_MCP_FETCH_URLS`).
- See [docs/SECURITY.md](docs/SECURITY.md) and [docs/PRIVACY.md](docs/PRIVACY.md).
