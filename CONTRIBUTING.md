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
Use GitHub only (no public email on this project):

- Bugs / features: Issues or Discussions
- Security: [SECURITY.md](./SECURITY.md) (private vulnerability reporting)
- Proprietary licensing: Discussions (see [docs/COMMERCIAL.md](docs/COMMERCIAL.md))

## Conduct
Be respectful. No harassment.
