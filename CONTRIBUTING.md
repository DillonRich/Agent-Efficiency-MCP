# Contributing

This project is AGPL-3.0-only. Keep PRs focused on the local BYOK MCP.

## Dev

```bash
npm install
cp .env.example .env   # your key; never commit
npm run build
npm test
npm run smoke
npm run doctor
```

Also see [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) and [SECURITY.md](./SECURITY.md).

## Guidelines
- Do not add hosted billing or cloud metering as core features.
- Prefer provider adapters under `src/providers/`.
- Keep MCP stdout clean (log to stderr only).
- Update `docs/` when behavior changes.
- Contributions are licensed under AGPL-3.0-only unless we agree otherwise in writing.

## Publish (maintainers)

```bash
npm run build && npm test && npm run smoke:offline
npm pack --dry-run   # confirm .env is not in the tarball
npm publish --access public
```

## Commercial use
Closed-source licensing: [docs/COMMERCIAL.md](docs/COMMERCIAL.md).

## Contact
Questions, suggestions, or partnership ideas: **knextdr@gmail.com**

- Prefer GitHub Issues / Discussions for public bugs and feature ideas when you can.
- Security reports: [SECURITY.md](./SECURITY.md) (email, not a public issue).
- Proprietary licensing: same inbox, subject `Commercial license inquiry - Agent Efficiency MCP`.

## Conduct
Be respectful. No harassment.
