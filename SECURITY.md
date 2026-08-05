# Security Policy

## Supported versions
Security fixes land on the latest `agent-efficiency-mcp` release on GitHub and npm.

## Reporting a vulnerability
Use GitHub’s private vulnerability reporting on this repository (Security tab → Report a vulnerability).

Include:

- Affected version or commit
- Reproduction steps
- Impact (data exposure, SSRF, path escape, etc.)

Do not open a public GitHub issue for unfixed vulnerabilities.

## Design boundaries
- Local BYOK. Prompts go to your chosen LLM API or local model, not our servers.
- Forced file and media paths stay under `workspace_root`.
- URL enrichment blocks private and link-local targets by default (`PROMPT_MCP_FETCH_URLS`).
- See [docs/SECURITY.md](docs/SECURITY.md) and [docs/PRIVACY.md](docs/PRIVACY.md).
