# Azure Lab (HF rewriter experiments)

**Region default:** `eastus`  
**Subscription:** use `az account show` (current: Azure subscription 1 / Operations@squwak.com)  
**Do not commit secrets.** Put keys in `.env` only.

## Status (2026-07-22)

| Item | Status |
|------|--------|
| Azure CLI logged in (account show) | Yes |
| Management API token / GPU ops | **Blocked** — `AADSTS530035` security defaults; run interactive `az login` refresh |
| HF_TOKEN | **Missing** — add to `.env` for Inference API or model download |
| Resource group | Not created yet (script ready) |

### Unblock checklist
```bash
az logout
az login --tenant b49d696f-894f-4011-9dd2-846077635ea4
az account set --subscription "Azure subscription 1"
az vm list-usage --location eastus -o table
```
Create budget alert in Portal before any GPU VM.

## Lab resource naming
- Resource group: `rg-promptmcp-lab`
- Location: `eastus`
- Scripts: `infra/azure/lab/`

## Serving target
OpenAI-compatible Chat Completions so [src/providers](../src/providers) can swap:

```env
REWRITE_PROVIDER=openai_compat
REWRITE_API_BASE=https://<endpoint>/v1
REWRITE_API_KEY=...
REWRITE_API_MODEL=Qwen/Qwen2.5-7B-Instruct
```

## After GPU quota confirmed
1. `pwsh infra/azure/lab/create-lab.ps1` (creates RG + notes)
2. Deploy VM or Azure ML online endpoint (see `infra/azure/lab/README.md`)
3. `npm run eval -- --provider deepseek` then `--provider openai_compat`
4. Record Go/No-Go in DECISIONS.md
