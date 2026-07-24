# Test Plan — Functional MVP

## Automated smoke (no Cursor)

From the PromptMCP repo:

```bash
npm run build
npm run smoke
```

With a BYOK key in `.env`, smoke also performs a live optimize and writes `Agent_Efficiency_MCP.smoke.md` (gitignored).

### Pass criteria
- [ ] `resolveWorkspaceRoot` accepts this repo absolute path
- [ ] Context gather sees `package.json`
- [ ] Validator strips invented paths and code fences
- [ ] `writeAgentIntent` creates `Agent_Efficiency_MCP.md` in a temp dir
- [ ] (optional) Live DeepSeek returns a structured blueprint

## Cursor live reliability (separate test project)

### Setup
1. `npm run build` in PromptMCP
2. Create `.env` with `DEEPSEEK_API_KEY`
3. Register MCP in Cursor (see root README)
4. Open a **different** project; run `npx agent-efficiency-mcp init --project <dir>` (installs `templates/00-promptmcp.mdc`)
5. Ensure PromptMCP shows as connected/enabled

### Cases

| # | Scenario | Pass |
|---|----------|------|
| 1 | Messy prompt without `@mcp:ignore` | First tool call is `optimize_and_blueprint_intent` before edits |
| 2 | File write | `Agent_Efficiency_MCP.md` appears in the **test project** root (not PromptMCP install dir) |
| 3 | Freeze | Agent prints pause message and stops without coding |
| 4 | Quality | Blueprint dense, no code fences, paths look real |
| 5 | GO | After `GO`, agent reads `Agent_Efficiency_MCP.md` and executes |
| 6 | Bypass | `@mcp:ignore what is 2+2?` does not call the tool |

### Failure logging
Record misses in [STATUS.md](./STATUS.md) (interception miss, wrong path, no freeze, bad blueprint).

## Regression after prompt/rule changes
Re-run `npm run smoke` and cases 1–6 before considering a reliability change done.
