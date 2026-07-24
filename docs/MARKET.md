# Market context (archived sizing notes)

**Status:** Historical / optional. **Not a live monetization plan.**  
**Product direction:** Open-source local BYOK (AGPL-3.0-only + commercial dual-license for proprietary use). Paid SaaS tiers were cancelled.

Use this page only as rough ICP sizing for GitHub adoption — stars, clones, issues — not ARR forecasts.

## Published anchors (AI coding / vibe-adjacent)

| Signal | Approximate figure | Source notes |
|--------|-------------------|--------------|
| Devs using / planning AI coding tools | ~**84%** of surveyed pros | Stack Overflow 2025 (widely cited) |
| Trust AI output | ~**29%** trust (down from ~40%) | Same wave of SO / industry summaries — implies large “careful” cohort |
| GitHub Copilot cumulative users | ~**20M** (Jul 2025) | Microsoft earnings commentary |
| Cursor DAU | **1M+** | Bloomberg / company-adjacent press 2025–26 |

“Vibe coding” is not an official census category. Treat **agentic IDE users** (Cursor / Windsurf / Claude Code / Copilot agent modes) as the practical proxy.

## ICP (who this tool is for)

Serious builders who already pay for Cursor / Claude / Copilot, want **pause-and-approve** control, and will not add another mandatory subscription for a rewrite layer.

Success metrics for this OSS phase:
- Clean `npx agent-efficiency-mcp@latest init` install
- Soft-gate first-call rate in personal dogfood ≥70% (n≥20)
- Issues/PRs from real users
- Stars / clones trend

## Cancelled commercial funnel (do not revive)

Trial→paid tiers (~$15 / $25 / $40), Stripe metering, and ARR models were explored and **superseded** by the local BYOK pivot. See [DECISIONS.md](./DECISIONS.md) and [COMMERCIAL.md](./COMMERCIAL.md) (dual-license contact only).
