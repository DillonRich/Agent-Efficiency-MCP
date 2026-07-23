# Demo GIF / screen recording guide

Nothing sells a prompt tool like watching messy input become a controlled blueprint.

## Suggested length
**45–90 seconds.** Silent or light captions. Looping GIF or MP4 in README.

## Shot list
1. **Terminal (10s)** — `npx agent-efficiency-mcp init --project ./demo-app`  
   Show absolute path printout for `Agent_Efficiency_MCP.md`.
2. **IDE MCP panel (5s)** — `agent-efficiency-engine` connected (green).
3. **Messy prompt (15s)** — Paste something like:

   ```text
   @promptmcp:include @promptmcp:file[src/app.ts]
   hey can you make this login page nicer and also look at stripe checkout somehow thanks
   ```

4. **Freeze (5s)** — Agent prints the blueprint approval line and stops.
5. **Open `Agent_Efficiency_MCP.md` (20s)** — Scroll: objective, vectors, media/research if any, factual `PROMPTMCP_META` (no fake time-saved).
6. **Edit one bullet (optional, 5s)** — Show human control.
7. **Type `GO` (15s)** — Agent executes from the blueprint (short successful edit).

## Capture tips
- Use a clean demo folder; large readable font.
- Hide personal paths if needed (or use a neutral username).
- Never show real API keys on screen.
- Tools: Windows Game Bar, OBS, or CapCut; export GIF via [gif.ski](https://gif.ski/) or ScreenToGif.

## README embed
```markdown
![PromptMCP demo](docs/assets/demo.gif)
```

Checked-in storyboard GIF: [`docs/assets/demo.gif`](./assets/demo.gif)  
Regenerate offline (no screen capture needed):

```bash
npm run demo-gif
```

For a live IDE recording later, replace that file with your OBS/gif.ski export using the shot list above.