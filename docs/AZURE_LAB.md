# Azure Lab (retired)

**Status:** Archived. Not on the product path.

Early experiments explored a self-hosted Hugging Face rewriter on Azure for a cancelled commercial cloud offering. The shipping product is **local BYOK only** — users bring DeepSeek / OpenAI / Anthropic / Gemini / xAI / local endpoints via `.env`.

## If you still want a private OpenAI-compatible endpoint

```env
REWRITE_PROVIDER=openai_compat
REWRITE_API_BASE=https://<your-endpoint>/v1
REWRITE_API_KEY=...
REWRITE_API_MODEL=<model-id>
```

Or use `REWRITE_PROVIDER=local` with Ollama / LM Studio / vLLM on your LAN. See `.env.example`.

Do not commit cloud credentials. Lab scripts under `infra/` (if present locally) are gitignored leftovers from the cancelled SaaS pivot.
