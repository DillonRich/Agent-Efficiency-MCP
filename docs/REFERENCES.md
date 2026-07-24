# References

## Origin design thread
- [Google AI Mode conversation](https://share.google/aimode/OvN5swZbE704L26KA) — product discovery, UX, architecture, DeepSeek wiring, Cursor handoff.

## Adjacent / competitor notes
| Name | Relevance | Gap vs PromptMCP |
|------|-----------|------------------|
| Bubobot `mcp-prompt-optimizer` | Prompt optimize MCP tools | Chat-centric; no hard freeze HUD |
| MCP Prompt Enhancer | Project/git context injection | Different UX; not pause-and-approve file |
| Sentry Prompt Optimizer Skill | Iterative prompt refinement | Skill-oriented; not our freeze loop |
| PromptLayer / Langfuse / Maxim | Eval & observability platforms | External dashboards; not IDE pause UX |

## Platform constraints (remember)
- MCP outputs: text / markdown / structured tool results — not custom Cursor UI.
- Host agent decides tool calls; servers cannot force orchestration.

## APIs & SDKs (in use)
- Model Context Protocol TypeScript SDK: `@modelcontextprotocol/sdk`
- DeepSeek Chat Completions: `https://api.deepseek.com/chat/completions` — [docs](https://api-docs.deepseek.com/)
- Default model: `deepseek-v4-flash` (legacy `deepseek-chat` deprecated 2026-07-24)

## Internal templates
- Consumer IDE rules: `templates/00-promptmcp.mdc` (via `npx agent-efficiency-mcp init`)
