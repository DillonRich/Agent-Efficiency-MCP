/** Shared product constants */

/** Blueprint HUD written at workspace root (user may move freely). */
export const BLUEPRINT_FILENAME = "Agent_Efficiency_MCP.md";

/** Env override for blueprint filename */
export function resolveBlueprintFilename(): string {
  const fromEnv = process.env.PROMPT_MCP_BLUEPRINT?.trim();
  return fromEnv || BLUEPRINT_FILENAME;
}

export const RULES_MARKER_START = "<!-- PROMPTMCP:START -->";
export const RULES_MARKER_END = "<!-- PROMPTMCP:END -->";

export const MCP_SERVER_KEY = "agent-efficiency-engine";
