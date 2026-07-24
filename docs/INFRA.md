# Infrastructure (OSS local)

## Production path (only path that matters)
```text
Cursor --stdio--> local PromptMCP --HTTPS--> user's chosen LLM API
                              \--> write Agent_Efficiency_MCP.md on disk
```

No PromptMCP cloud, no Stripe, no shared API keys.

## BYOK providers
| Provider | Env |
|----------|-----|
| DeepSeek | `DEEPSEEK_API_KEY` |
| OpenAI | `OPENAI_API_KEY` |
| Anthropic | `ANTHROPIC_API_KEY` |
| Gemini | `GEMINI_API_KEY` |
| xAI / Grok | `XAI_API_KEY` or `GROK_API_KEY` |
| Local (Ollama / LM Studio / vLLM) | `LOCAL_LLM_BASE` + `LOCAL_LLM_MODEL` |
| OpenAI-compatible cloud | `REWRITE_API_BASE` + `REWRITE_API_KEY` + `REWRITE_API_MODEL` |
| Mock (CI) | `REWRITE_PROVIDER=mock` |

`REWRITE_PROVIDER=auto` picks the first available key / local endpoint.

## Legacy folders (not product)
`services/gateway`, `infra/stripe`, `infra/resend`, `infra/azure` — left as archived experiments from an earlier commercial plan. Safe to ignore for OSS users.
