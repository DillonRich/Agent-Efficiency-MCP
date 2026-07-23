# Market sizing (rough)

**Status:** Planning estimates, not audited research.  
**Last updated:** 2026-07-22  

Numbers mix public reporting (often press/secondary) with **labeled guesses**. Use ranges, not point forecasts.

## Published anchors (AI coding / vibe-adjacent)

| Signal | Approximate figure | Source notes |
|--------|-------------------|--------------|
| Devs using / planning AI coding tools | ~**84%** of surveyed pros | Stack Overflow 2025 (widely cited) |
| Trust AI output | ~**29%** trust (down from ~40%) | Same wave of SO / industry summaries — implies large “careful” cohort |
| GitHub Copilot cumulative users | ~**20M** (Jul 2025) | Microsoft earnings commentary |
| GitHub Copilot paid | ~**4.7M** (Jan 2026) | Microsoft FY26 disclosures (press) |
| Cursor DAU | **1M+** | Bloomberg / company-adjacent press 2025–26 |
| Cursor MAU (est.) | **~2M–7M** (wide; press varies) | Secondary reports; treat as order-of-magnitude |
| Cursor paying (press) | **1M+** claimed in some 2026 roundups | Verify; may conflate seats/accounts |
| Workplace use (JetBrains-style pulse) | Copilot ~**29%**, Cursor / Claude Code ~**18%** each | Jan 2026 AI Pulse summaries |
| AI code assistant market | ~**$3–3.5B** (2025, Gartner-style); broader tools higher | Category definitions vary |

“Vibe coding” is not an official census category. Treat **agentic IDE users** (Cursor / Windsurf / Claude Code / Copilot agent modes) as the practical proxy.

---

## Funnel model (best-guess)

```text
AI coding users (broad)
        ↓  ~25–40% use agentic / multi-file “vibe” workflows regularly
Agentic vibe coders
        ↓  ~15–25% are quality / control oriented (your ICP)
Purposeful vibe ICP
        ↓  ~20–40% reachable near-term (MCP hosts, English, discover you)
Serviceable ICP (SAM)
        ↓  try product
        ↓  ~5–15% convert to paid (strong PLG; often lower Y1)
Paying customers
        ↓  ~60–80% annual retention if habit forms (optimistic SaaS-dev-tool)
```

### Layer estimates (global, order-of-magnitude)

| Layer | Low | Mid | High | Notes |
|-------|-----|-----|------|--------|
| A. AI coding users (active-ish) | 15M | **25M** | 40M | Copilot-scale + others; not all daily |
| B. Agentic / vibe regulars | 3M | **8M** | 15M | Guess: 25–40% of A |
| C. Purposeful / quality ICP | 0.5M | **1.5M** | 3M | Guess: 15–25% of B (aligns with low-trust / high-care builders) |
| D. Near-term SAM (can install MCP + care) | 80k | **250k** | 600k | Guess: 20–40% of C |
| E. Year-1–2 paying (SOM, execution-dependent) | 1k | **5k** | 20k | After awareness × trial × convert |

### Conversion math (illustrative)

Assume mid SAM **250k**, **10%** ever try you in 24 months → **25k** trials.  
**8%** trial→paid → **~2k** paying.  
Optimistic viral + Cursor marketplace: trials 40k, convert 12% → **~5k** paying.

| Paying | ARPU $20.5 (15/25/40 mix) | ARR |
|--------|---------------------------|-----|
| 1,000 | $20.5k/mo | **~$0.25M** |
| 5,000 | $102k/mo | **~$1.2M** |
| 20,000 | $410k/mo | **~$4.9M** |

Retention: if workflow habit sticks, **net revenue retention** can be strong (expand tiers). If hosts add built-in “enhance prompt,” churn risk rises — moat must be workflow, not the idea.

---

## Interpretation

- **TAM** (agentic vibe): millions — real category.  
- **ICP** (purposeful): roughly **~0.5–3M** people globally who *might* love a GO-gate.  
- **Buyers you can realistically win soon:** thousands → low tens of thousands, not “all Cursor users.”  
- **Conversion:** slim at top of funnel; healthier **among people who complete one successful GO cycle** (your “try → keep” thesis).  
- **Revenue:** a focused **$1–5M ARR** company is plausible if distribution works; “everyone vibe codes so we get 100k payers” is not the base case.

### Optimistic ceiling (not a forecast)
If **5% of mid ICP (1.5M)** ever paid → **75k** × **$15** = **~$13.5M/yr** at floor tier. That’s a valid *upside sketch* if distribution and product both work over years — not year-one CRM math. Near-term planning should use trial→paid rates on people who actually install.

## Monetization / distribution
**AGPL-3.0-only open source · BYOK · commercial dual-license for closed use · no PromptMCP subscription.**  
Earlier SaaS ARR estimates are historical only — not the current goal. Success = usable local tool + GitHub presence + portfolio.

### Personal success bar (founder)
Daily dogfood + public repo that careful vibe coders can install in minutes.
- Landing in Cursor MCP directory / viral demo (before/after agent turns)  
- Hosts that obey tools (or a one-click `/optimize`)  
- Team plans (one quality-conscious lead → seat expansion)
