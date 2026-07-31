# Privacy

PromptMCP is local-first. You bring your own key.

| Data | Where it goes |
|------|----------------|
| Chat prompt + light workspace context | Your rewrite API (DeepSeek, OpenAI, Anthropic, Gemini, xAI, OpenRouter, or local LLM) |
| `@promptmcp:media` images (when vision is on) | Same rewrite API, as multimodal attachments |
| Blueprint `Agent_Efficiency_MCP.md` | Your disk, under the project workspace |
| Blueprint history | `.promptmcp/history/` on disk (`PROMPT_MCP_KEEP_HISTORY=0` to disable) |
| Optional URL enrich for `@promptmcp:search` | Short GET from your machine to public URLs (title/snippet). Private hosts blocked. |
| Our servers | None. No cloud account for this tool. |

We do not sell data. There is no analytics SDK in this package.

Disable URL enrich: `PROMPT_MCP_FETCH_URLS=0`.  
Disable vision: `PROMPT_MCP_VISION=0`.

For maximum privacy, use `REWRITE_PROVIDER=local` with Ollama or LM Studio on localhost or LAN.
