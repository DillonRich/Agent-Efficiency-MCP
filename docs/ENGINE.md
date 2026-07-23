# Engine — BYOK rewrite providers

## Select provider
`REWRITE_PROVIDER=auto|deepseek|openai|anthropic|gemini|xai|local|openai_compat`

Aliases: `grok`→`xai`, `google`→`gemini`, `ollama`/`lmstudio`/`vllm`→`local`, `openrouter`→`openai_compat`

Default **`auto`**: first configured among DeepSeek → OpenAI → Anthropic → Gemini → xAI → local → OpenAI-compat.

## Select model
Priority:
1. `REWRITE_MODEL` (any provider)
2. Provider-specific `*_MODEL` / `LOCAL_LLM_MODEL` / `REWRITE_API_MODEL`
3. Provider default (cloud only; local/compat require explicit model)

Friendly aliases live in `src/providers/model.ts`. Unknown values pass through as exact API ids.

## Local / private LLM
`REWRITE_PROVIDER=local` posts to OpenAI-compatible `POST {base}/chat/completions`.

| Host | Typical base |
|------|----------------|
| Ollama (this PC) | `http://127.0.0.1:11434/v1` |
| Ollama / vLLM on LAN mini-PC | `http://192.168.x.x:11434/v1` |
| LM Studio | `http://127.0.0.1:1234/v1` |
| llama.cpp server | `http://127.0.0.1:8080/v1` |

Set `LOCAL_LLM_MODEL` to whatever `ollama list` / LM Studio shows. Key defaults to `local` (many local servers ignore it).

## Workspace context (rich)
`gatherWorkspaceContext` sends the rewriter:
- Top-level + capped recursive path walk (skips node_modules/dist/…)
- Stack hints, package/manifest summary, README/AGENTS snippets
- Git changed files + recent commits
- Forced-file contents (capped snippets) when `@promptmcp:file` / implicit paths apply

## Contracts
- System prompt: `CENTRAL_COMPRESSION_PROMPT` in `src/providers/types.ts`
- Metrics: factual `PROMPTMCP_META` only (no minutes-saved)
- Validate: `src/validate.ts`
- Temperature: `0.1` where supported
- Blueprint file: `Agent_Efficiency_MCP.md` (`PROMPT_MCP_BLUEPRINT` override)
- Dry run: `PROMPT_MCP_DRY_RUN=1`
## Defaults
| Provider | Default model |
|----------|---------------|
| deepseek | `deepseek-v4-flash` |
| openai | `gpt-4.1-mini` |
| anthropic | `claude-sonnet-4-20250514` |
| gemini | `gemini-2.5-flash` |
| xai | `grok-3-mini` |
| local / openai_compat | *(required)* |

## Eval
`npm run eval -- --provider deepseek` (or another installed provider)
