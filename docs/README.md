# PromptMCP Documentation — Source of Truth

These markdown files are the **canonical project memory**. Agents and humans should read and update them before inventing scope.

| Doc | Purpose |
|-----|---------|
| [PRODUCT.md](./PRODUCT.md) | Vision, positioning, OSS BYOK scope |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System components and data flow |
| [WORKFLOW.md](./WORKFLOW.md) | Pause / GO / ignore UX contract |
| [DIRECTIVES.md](./DIRECTIVES.md) | `@promptmcp:` command reference (user-facing) |
| [SECURITY.md](./SECURITY.md) | Secrets, trust boundary, reporting |
| [PRIVACY.md](./PRIVACY.md) | What data goes where |
| [TRUST.md](./TRUST.md) | Compliance / publish checklist |
| [PUBLISH.md](./PUBLISH.md) | npm account + publish steps |
| [DEMO.md](./DEMO.md) | Screen recording / GIF shot list |
| [HOSTS.md](./HOSTS.md) | IDE config matrix + tips |
| [QUALITY.md](./QUALITY.md) | Provider dialects, eval, gate success |
| [ENGINE.md](./ENGINE.md) | Rewrite rules, context, provider contract |
| [STRUCTURE.md](./STRUCTURE.md) | Repo file hierarchy |
| [DECISIONS.md](./DECISIONS.md) | Locked decisions (ADR-style log) |
| [ROADMAP.md](./ROADMAP.md) | Phased plan (OSS) |
| [STATUS.md](./STATUS.md) | Current phase, blockers, next action |
| [REFERENCES.md](./REFERENCES.md) | Competitors, links, research notes |
| [TEST_PLAN.md](./TEST_PLAN.md) | Smoke + Cursor live pass/fail cases |
| [EVAL.md](./EVAL.md) | Optional provider quality eval |
| [EVAL_TREND.md](./EVAL_TREND.md) | Auto trend of recent scorecards |
| [IMPROVEMENT_PROGRAM.md](./IMPROVEMENT_PROGRAM.md) | Continuous quality checklist + R1–R10 |
| [SCORECARD.md](./SCORECARD.md) | Latest quantitative snapshot |
| [DOGFOOD_GATE.md](./DOGFOOD_GATE.md) | Soft-gate compliance logging |
| [GOLDEN_REVIEW.md](./GOLDEN_REVIEW.md) | Human GO review for hard cases |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Common install / gate / auth fixes |
| [COMMERCIAL.md](./COMMERCIAL.md) | AGPL + commercial dual-license |
| [EVAL_RESULTS.md](./EVAL_RESULTS.md) | Latest eval scores |
| [INFRA.md](./INFRA.md) | Local-only; archived cloud notes |
| [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md) | OSS release checklist |
| [MARKET.md](./MARKET.md) | ICP / historical sizing (context only) |
| [CHANGELOG.md](./CHANGELOG.md) | Notable project changes |
| [AZURE_LAB.md](./AZURE_LAB.md) | Archived lab notes (optional) |

## How to use

1. Start of session → read **STATUS.md** + latest **DECISIONS.md** entries.
2. Before implementing → confirm against **PRODUCT.md** scope and **ARCHITECTURE.md**.
3. After a decision → append to **DECISIONS.md** and refresh **STATUS.md**.
4. After shipping a milestone → note it in **CHANGELOG.md** and advance **ROADMAP.md** / **STATUS.md**.

Origin context: [Google AI Mode design conversation](https://share.google/aimode/OvN5swZbE704L26KA).
