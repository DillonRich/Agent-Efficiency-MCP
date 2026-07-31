# Repository structure

```text
Agent-Efficiency-MCP/
├── README.md                 # Install + product entry
├── LICENSE                   # AGPL-3.0-only
├── SECURITY.md               # Vulnerability reporting
├── CONTRIBUTING.md
├── package.json
├── src/                      # MCP server, CLI, providers, quality
├── templates/                # PRIORITY 0 Cursor rules + host tips
├── scripts/                  # smoke, eval, dogfood, quality-loop
├── test/
├── fixtures/eval/            # Eval cases (+ reviewed goldens)
├── docs/                     # User + design docs (see docs/README.md)
└── .github/                  # CI, issue/PR templates
```

Runtime artifacts (not committed): `.env`, `.cursor/`, `Agent_Efficiency_MCP.md`, `.promptmcp/`, `dist/`.
