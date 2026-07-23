# Golden GO-worthiness review (E09–E14)

Checklist for GO-worthiness of hard prompt archetypes. Score each golden `would GO?` 1–5 (pass ≥ 3).

Reviewed: **2026-07-22** against DeepSeek flash goldens in [`fixtures/eval/reviewed/deepseek/`](../fixtures/eval/reviewed/deepseek/).

| ID | Archetype | Review focus | would GO? | Status |
|----|-----------|--------------|-----------|--------|
| E09 | overconstrained / contradictory | Picks one safe slice; CONFLICT + Non-goals present; no full rewrite | **5** | pass — DI in `engine.ts`, honors “never add tests”, drops cloud/beauty tour |
| E10 | contradictory | Resolves always/never; smaller interpretation wins | **4** | pass — chooses verifiable “add tests + JSDoc”, Non-goals drop standalone docs |
| E11 | long_ramble | One objective; anecdotes dropped; path budget tight | **4** | pass — narrows to token waste in `engine.ts`; defers README/install vibes |
| E12 | multi_goal | Single primary goal; others deferred | **5** | pass — retry/backoff only; README/license/Cohere/CLI deferred |
| E13 | underspecified bug | Grounds in git/server paths; not “fix everything” | **4** | pass — typecheck → server start; edit set capped (commit names are heuristic) |
| E14 | tour-risk | No “explore the codebase”; concrete vectors only | **4** | pass — server error-handling slice; no codebase tour (vectors thin but safe) |

**Mean would-GO:** 4.3 / 5 — all ≥ 3.

Automated stand-in:
- mock eval: R1–R10 **100%** (includes E09–E14)
- DeepSeek full (2026-07-22): mean composite **100**, fails=0

Provider compare (Sonnet / GPT): **blocked** — only `DEEPSEEK_API_KEY` present locally. Re-run when keys exist:

```bash
npm run eval -- --provider openai
npm run eval -- --provider anthropic
```
