# Privacy

PromptMCP is designed for **local-first, BYOK** use.

| Data | Where it goes |
|------|----------------|
| Your chat prompt + light workspace context | Your chosen rewrite API (DeepSeek / OpenAI / Anthropic / Gemini / xAI / OpenRouter / local LLM) |
| `@promptmcp:media` images (if vision on) | Same rewrite API, as multimodal attachments |
| Blueprint file `Agent_Efficiency_MCP.md` | Your disk, under the project workspace |
| Blueprint history | `.promptmcp/history/` on your disk (disable with `PROMPT_MCP_KEEP_HISTORY=0`) |
| Optional URL enrich for `@promptmcp:search` | Brief GET to public URLs from your machine (title/snippet; private hosts blocked) |
| Our servers | **None** — no cloud account for this tool |

We do not sell data. There is no analytics SDK in this package.

Disable URL enrich: `PROMPT_MCP_FETCH_URLS=0`. Disable vision: `PROMPT_MCP_VISION=0`.

For maximum privacy: `REWRITE_PROVIDER=local` pointing at Ollama/LM Studio on localhost or LAN.
