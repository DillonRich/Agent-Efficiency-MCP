# Contributing

Agent Efficiency Engine MCP is AGPL-3.0-only. Keep PRs focused on the local BYOK MCP.

## Dev
```bash
npm install
cp .env.example .env   # your key — never commit
npm run build
npm test
npm run smoke
npm run doctor
```

See also [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) and [SECURITY.md](./SECURITY.md).

## Guidelines
- Do not add hosted billing / cloud metering as core features.
- Prefer provider adapters under `src/providers/`.
- Keep MCP stdout clean (log to stderr only).
- Update `docs/` when behavior changes.
- By contributing, you agree your contributions are licensed under AGPL-3.0-only (same as the project), unless we arrange otherwise in writing.

## Commercial use
Closed-source licensing: see [docs/COMMERCIAL.md](docs/COMMERCIAL.md).

## Code of collaboration
Be respectful. No harassment. Security issues: see [docs/SECURITY.md](docs/SECURITY.md).
