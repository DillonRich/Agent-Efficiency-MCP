# Repository Structure

```text
PromptMCP/
├── .cursor/rules/          # Maintainer agent rules
├── docs/                   # SSoT (PRODUCT, ARCHITECTURE, …)
├── fixtures/eval/          # Eval cases / goldens
├── src/
│   ├── server.ts           # MCP stdio entry
│   ├── engine.ts
│   ├── context.ts
│   ├── validate.ts
│   ├── directives.ts       # @promptmcp: parser + post-process
│   └── providers/          # deepseek, openai, anthropic, gemini, xai, local, openai_compat
├── scripts/                # smoke, eval-providers
├── templates/              # consumer Cursor rules
├── site/                   # Optional static OSS landing (no billing)
├── infra/                  # ARCHIVED commercial experiments (ignore)
├── services/gateway/       # ARCHIVED metering stub (ignore)
├── package.json
├── LICENSE                 # AGPL-3.0-only
├── CONTRIBUTING.md
└── README.md
```

