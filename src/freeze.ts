/**
 * Host freeze / checkpoint message after a successful optimize write.
 */
import { resolveBlueprintFilename } from "./constants.js";

export function buildFreezeMessage(
  blueprintPath: string,
  blueprint: string,
): string {
  const hasMedia = /##\s*Media\s*\/\s*reference assets/i.test(blueprint);
  const hasResearch = /##\s*Research\s*\/\s*web references/i.test(blueprint);

  const checklist: string[] = [
    "After the user types GO, execute using the blueprint file only:",
    `1. Read \`${resolveBlueprintFilename()}\` at the path below.`,
  ];
  let n = 2;
  if (hasMedia) {
    checklist.push(
      `${n}. Open and inspect every path under **Media / reference assets** before coding.`,
    );
    n += 1;
  }
  if (hasResearch) {
    checklist.push(
      `${n}. Browse every URL under **Research / web references** and apply the paired notes before coding.`,
    );
    n += 1;
  }
  checklist.push(
    `${n}. Prefer Targeted Codebase Vectors; do not invent paths.`,
  );

  return `SUCCESS: Optimization completed.

Blueprint written to:
${blueprintPath}

CRITICAL DIRECTIVE: You are now at a hard checkpoint. You do NOT have authorization to proceed with any file edits, code generation, additional codebase reads, or terminal commands for this task yet.

You must now output EXACTLY this message to the user chat window and STOP your execution loop entirely until they reply:

### 🛑 Blueprint Generated. Awaiting your approval in \`${resolveBlueprintFilename()}\`. Type GO to proceed.

${checklist.join("\n")}`;
}
