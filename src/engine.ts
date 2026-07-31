import type { WorkspaceContext } from "./context.js";
import {
  applyDirectivePostProcess,
  DIRECTIVE_HELP,
  isHelpOnly,
  parseDirectives,
  type DirectiveSet,
} from "./directives.js";
import {
  buildEnrichmentPayload,
  enrichDirectives,
} from "./enrich.js";
import {
  resolveProvider,
  type OptimizeResult,
} from "./providers/index.js";
import {
  buildRepairUserMessage,
  buildSystemPrompt,
} from "./providers/prompt-variants.js";
import {
  addUsage,
  emptyUsage,
  estimateRewriteUsd,
  type TokenUsage,
} from "./providers/usage.js";
import {
  appendBlueprintDelta,
  readPreviousBlueprint,
} from "./blueprint-diff.js";
import { classifyPromptArchetype } from "./quality/archetype.js";
import { ensureBoundaryBullets } from "./quality/boundaries.js";
import {
  ensureVerificationLanguage,
  stripFillerLanguage,
  tightenObjective,
} from "./quality/polish.js";
import { scoreBlueprintQuality } from "./quality/score.js";
import { validateAndSanitizeBlueprint } from "./validate.js";
import { loadVisionImages } from "./vision.js";

export type { OptimizeResult } from "./providers/index.js";
export { CENTRAL_COMPRESSION_PROMPT } from "./providers/index.js";

/** Factual metrics only — never invent time-saved. */
export function buildMetricsHeader(options: {
  rawPrompt: string;
  blueprint: string;
  context: WorkspaceContext;
  directives: DirectiveSet;
  provider: string;
  model: string;
  repaired?: boolean;
  visionImages?: number;
  archetype?: string;
  archetypeTags?: string[];
  usage?: TokenUsage;
}): string {
  const activeFlags: string[] = (
    [
      "include",
      "long",
      "short",
      "test",
      "tone",
      "diff",
      "strict",
    ] as const
  ).filter((k) => options.directives[k]);
  if (options.directives.files.length) {
    activeFlags.push(`file×${options.directives.files.length}`);
  }
  if (options.directives.media.length) {
    activeFlags.push(`media×${options.directives.media.length}`);
  }
  if (options.directives.scopes.length) {
    activeFlags.push(`scope×${options.directives.scopes.length}`);
  }
  if (options.directives.searches.length) {
    activeFlags.push(`search×${options.directives.searches.length}`);
  }

  const lines = [
    "<!-- PROMPTMCP_META",
    `provider: ${options.provider}`,
    `model: ${options.model}`,
    `archetype: ${options.archetype || "other"}`,
    `archetype_tags: ${options.archetypeTags?.join(",") || "(none)"}`,
    `input_chars: ${options.rawPrompt.length}`,
    `blueprint_chars: ${options.blueprint.length}`,
    `compression_ratio: ${
      options.rawPrompt.length
        ? (options.blueprint.length / options.rawPrompt.length).toFixed(3)
        : "0"
    }`,
    `context_bytes: ${options.context.contextBytes}`,
    `context_budget: ${options.context.contextBudget || "standard"}`,
    `known_paths: ${options.context.knownPaths.length}`,
    `git_changed_files: ${options.context.gitChangedCount}`,
    `forced_files: ${options.directives.files.length}`,
    `forced_media: ${options.directives.media.length}`,
    `vision_images: ${options.visionImages ?? 0}`,
    `research_urls: ${options.directives.searches.length}`,
    `directives: ${activeFlags.length ? activeFlags.join(",") : "(none)"}`,
    `repair_pass: ${options.repaired ? "yes" : "no"}`,
  ];

  if (options.usage && options.usage.totalTokens > 0) {
    lines.push(`prompt_tokens: ${options.usage.promptTokens}`);
    lines.push(`completion_tokens: ${options.usage.completionTokens}`);
    lines.push(`total_tokens: ${options.usage.totalTokens}`);
    const est = estimateRewriteUsd(options.model, options.usage);
    if (est) {
      lines.push(`est_usd: ${est}`);
      lines.push(`est_usd_note: approximate list rates; not a bill`);
    }
  }

  lines.push("-->");
  return lines.join("\n");
}

function stripModelMetricsNoise(blueprint: string): string {
  return blueprint
    .replace(/^<!--\s*METRICS:[\s\S]*?-->\s*/i, "")
    .replace(/^<!--\s*PROMPTMCP_META[\s\S]*?-->\s*/i, "")
    .replace(/Estimated Dev Time Saved:[^\n|]*/gi, "")
    .replace(/\|\s*Est\.?\s*rework loops avoided:[^\n]*/gi, "")
    // Models sometimes echo the system-prompt time-saved ban into the body.
    .replace(
      /^[ \t]*Do NOT invent ["']?minutes saved["']?[\s\S]*?(?:\n|$)/gim,
      "",
    )
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}

/**
 * Generate blueprint from raw_prompt. Directives are parsed first.
 * Uses provider-tuned system prompts and one validation repair retry.
 */
export async function generateOptimizedBlueprint(
  rawPrompt: string,
  context: WorkspaceContext,
  providerName?: string,
): Promise<OptimizeResult> {
  const directives = parseDirectives(rawPrompt);
  const warnings = [...directives.warnings, ...context.contextWarnings];

  if (directives.ignore) {
    return {
      blueprint: "",
      warnings: [
        ...warnings,
        "Prompt contains ignore directive — host should not call this tool.",
      ],
      model: "n/a",
      provider: "n/a",
      skipWrite: true,
      ignored: true,
    };
  }

  if (isHelpOnly(directives)) {
    return {
      blueprint: DIRECTIVE_HELP,
      warnings,
      model: "n/a",
      provider: "help",
      skipWrite: true,
      helpOnly: true,
    };
  }

  for (const f of directives.files) {
    if (!context.knownPaths.includes(f)) context.knownPaths.push(f);
    if (!context.forcedFiles.includes(f)) context.forcedFiles.push(f);
  }
  for (const m of directives.media) {
    if (!context.knownPaths.includes(m)) context.knownPaths.push(m);
    if (!context.forcedMedia.includes(m)) context.forcedMedia.push(m);
  }

  const archetype = classifyPromptArchetype(
    directives.cleanedPrompt || rawPrompt,
  );
  warnings.push(
    `Archetype: ${archetype.primary} (${archetype.tags.join(", ")})`,
  );

  const provider = resolveProvider(providerName);
  const systemPrompt = buildSystemPrompt(provider.name, directives, archetype);

  const enrichment = await enrichDirectives(
    directives,
    context.workspaceRoot,
  );
  warnings.push(...enrichment.warnings);

  const vision = loadVisionImages(
    context.workspaceRoot,
    directives.media.length ? directives.media : context.forcedMedia,
  );
  warnings.push(...vision.warnings);

  let images = vision.images;
  if (images.length > 0 && !provider.supportsVision) {
    warnings.push(
      `Provider "${provider.name}" does not support vision; media paths still forced in blueprint (IDE opens after GO).`,
    );
    images = [];
  } else if (images.length > 0) {
    warnings.push(
      `Vision: attached ${images.length} image(s) to rewrite (${images.map((i) => i.path).join(", ")}).`,
    );
  }

  const enrichBlock = buildEnrichmentPayload(enrichment);
  const promptBody =
    (directives.cleanedPrompt.trim() ||
      "(User provided only directives; infer intent from forced files/media/search if present.)") +
    (enrichBlock ? `\n\n${enrichBlock}` : "");

  let usage = emptyUsage();
  let { content, model, usage: u0 } = await provider.generate(
    promptBody,
    context,
    {
      systemPrompt,
      images,
    },
  );
  usage = addUsage(usage, u0);

  let validated = validateAndSanitizeBlueprint(content, context.knownPaths, {
    forcedPaths: [...directives.files, ...directives.media],
    strict: directives.strict,
  });

  let repaired = false;
  if (!validated.ok) {
    warnings.push(
      `First draft failed validation (${validated.errors.join("; ")}); running repair pass.`,
    );
    const repair = await provider.generate(
      buildRepairUserMessage({
        previousOutput: content,
        errors: validated.errors,
        warnings: validated.warnings,
      }),
      context,
      { systemPrompt, images },
    );
    content = repair.content;
    model = repair.model;
    usage = addUsage(usage, repair.usage);
    repaired = true;
    validated = validateAndSanitizeBlueprint(content, context.knownPaths, {
      forcedPaths: [...directives.files, ...directives.media],
      strict: directives.strict,
    });
  }

  if (!validated.ok) {
    throw new Error(
      `Blueprint failed validation after repair:\n- ${validated.errors.join("\n- ")}\n\n` +
        `Try: a stronger model (REWRITE_MODEL), @promptmcp:strict, or simplify the prompt.`,
    );
  }

  // Adaptive quality repair: if composite is weak, one densification pass
  const preScore = scoreBlueprintQuality({
    blueprint: validated.blueprint,
    knownPaths: context.knownPaths,
    rawPrompt,
  });
  if (!repaired && preScore.composite < 70) {
    warnings.push(
      `Composite ${preScore.composite} < 70; running adaptive quality repair.`,
    );
    const gaps = (
      [
        ["R4 objective density", preScore.r4_objective_density],
        ["R6 no filler", preScore.r6_no_filler],
        ["R7 boundaries", preScore.r7_boundaries],
        ["R8 verifiable", preScore.r8_verifiable],
        ["R9 no tour", preScore.r9_no_tour],
        ["R10 path budget", preScore.r10_path_budget],
      ] as const
    )
      .filter(([, ok]) => !ok)
      .map(([name]) => name);

    const repair = await provider.generate(
      buildRepairUserMessage({
        previousOutput: content,
        errors: [
          `Quality composite ${preScore.composite}/100 is below threshold.`,
          ...gaps.map((g) => `Improve: ${g}`),
        ],
        warnings: validated.warnings,
      }),
      context,
      { systemPrompt, images },
    );
    content = repair.content;
    model = repair.model;
    usage = addUsage(usage, repair.usage);
    repaired = true;
    validated = validateAndSanitizeBlueprint(content, context.knownPaths, {
      forcedPaths: [...directives.files, ...directives.media],
      strict: directives.strict,
    });
    if (!validated.ok) {
      throw new Error(
        `Blueprint failed validation after quality repair:\n- ${validated.errors.join("\n- ")}`,
      );
    }
  }

  let blueprint = applyDirectivePostProcess(
    stripModelMetricsNoise(validated.blueprint),
    directives,
    enrichment,
  );

  const boundaries = ensureBoundaryBullets(blueprint, archetype);
  blueprint = boundaries.text;
  if (boundaries.injected) {
    warnings.push("Injected Non-goals boundary (archetype required).");
  }
  if (boundaries.strippedTour) {
    warnings.push("Stripped tour-language bullet(s) from blueprint.");
  }

  const filler = stripFillerLanguage(blueprint);
  blueprint = filler.text;
  if (filler.changed) {
    warnings.push("Stripped filler/aesthetic language from blueprint.");
  }

  const objective = tightenObjective(blueprint);
  blueprint = objective.text;
  if (objective.changed) {
    warnings.push("Tightened Absolute Objective to ≤2 sentences.");
  }

  const verify = ensureVerificationLanguage(blueprint, context.stackHints);
  blueprint = verify.text;
  if (verify.injected) {
    warnings.push("Injected concrete verification commands.");
  }

  const prior = readPreviousBlueprint(context.workspaceRoot);
  const delta = appendBlueprintDelta(blueprint, prior);
  blueprint = delta.text;
  if (delta.added) {
    warnings.push("Appended Delta vs previous blueprint.");
  }

  const header = buildMetricsHeader({
    rawPrompt,
    blueprint,
    context,
    directives,
    provider: provider.name,
    model,
    repaired,
    visionImages: images.length,
    archetype: archetype.primary,
    archetypeTags: archetype.tags,
    usage: usage.totalTokens > 0 ? usage : undefined,
  });
  blueprint = `${header}\n${blueprint.replace(/^\s+/, "")}`;

  const dryRun =
    process.env.PROMPT_MCP_DRY_RUN === "1" ||
    process.env.PROMPT_MCP_DRY_RUN === "true";

  return {
    blueprint,
    warnings: [
      ...warnings,
      ...validated.warnings,
      ...(repaired ? ["Used validation repair pass."] : []),
      ...(dryRun ? ["DRY_RUN: blueprint will not be written to disk."] : []),
    ],
    model,
    provider: provider.name,
    skipWrite: dryRun,
    archetype: archetype.primary,
  };
}
