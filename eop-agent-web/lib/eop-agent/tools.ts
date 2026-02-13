/**
 * EOP Agent tools — Lab 0/2 core tools + Lab 5/6 domain tools.
 *
 * Each tool is defined as an OpenAI function-calling tool definition
 * plus an executor function. This mirrors Lab 2's "Pydantic to OpenAI tools"
 * approach, translated to TypeScript.
 */

import { ToolDefinition } from "@/lib/types";

// ═══════════════════════════════════════════
// Tool Definitions (OpenAI function calling format)
// ═══════════════════════════════════════════

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  // ── Lab 0: annotate_artifact ──
  {
    type: "function",
    function: {
      name: "annotate_artifact",
      description:
        "Tag a file or data artifact as part of the ECF evidence chain. Use when the user mentions a file, dataset, or figure/table they want to annotate with an ECF artifact type.",
      parameters: {
        type: "object",
        properties: {
          artifact_name: {
            type: "string",
            description:
              "Name or path of the file/artifact to annotate (e.g. 'data/measurements.csv', 'Figure 2').",
          },
          artifact_type: {
            type: "string",
            enum: [
              "input_data",
              "experimental_process",
              "output_data",
              "visual_data",
              "plotting_process",
              "visual_claims",
              "documentation",
            ],
            description:
              "ECF artifact type: one of the seven basic evidence chain types.",
          },
          description: {
            type: "string",
            description:
              "Optional short description of the artifact's role in the evidence chain.",
          },
        },
        required: ["artifact_name", "artifact_type"],
      },
    },
  },

  // ── Lab 0: link_to_claim ──
  {
    type: "function",
    function: {
      name: "link_to_claim",
      description:
        "Link an artifact or process to a scientific claim. Use when the user wants to associate evidence with a claim or figure/table with a scientific statement.",
      parameters: {
        type: "object",
        properties: {
          artifact_name: {
            type: "string",
            description:
              "Name or path of the artifact to link (e.g. 'results/metrics.csv', 'Figure 1').",
          },
          claim_text: {
            type: "string",
            description:
              "The scientific claim being supported (e.g. 'Our model achieves 95% accuracy on dataset D').",
          },
          link_type: {
            type: "string",
            enum: ["supports", "generates", "visualizes", "documents"],
            description:
              "How this artifact relates to the claim: supports (evidence), generates (produces the result), visualizes (presents it), documents (explains it).",
          },
        },
        required: ["artifact_name", "claim_text"],
      },
    },
  },

  // ── Lab 5: classify_repo_artifacts ──
  {
    type: "function",
    function: {
      name: "classify_repo_artifacts",
      description:
        "Given a list of files/directories from a research repository, classify each into one of the seven ECF artifact types. Use when the user provides a repo layout and wants to understand which files serve which evidence chain roles.",
      parameters: {
        type: "object",
        properties: {
          file_list: {
            type: "string",
            description:
              "A text listing of file paths and optional one-line descriptions, one per line. Example:\n  data/raw/samples.csv - Raw measurement data\n  scripts/train_model.py - Trains the model",
          },
        },
        required: ["file_list"],
      },
    },
  },

  // ── Lab 6: advise_disclosure_scope ──
  {
    type: "function",
    function: {
      name: "advise_disclosure_scope",
      description:
        "Given a scientific claim, determine its strength (existential vs. distributional) and recommend an appropriate disclosure scope (minimal, standard, or full). Use when the user describes what they claim in their paper and wants advice on how much to disclose.",
      parameters: {
        type: "object",
        properties: {
          claim_description: {
            type: "string",
            description:
              "A short description of the scientific claim (e.g. 'We trained a model that reaches 95% accuracy on the test set.').",
          },
        },
        required: ["claim_description"],
      },
    },
  },

  // ── Lab 5 bonus: suggest_directory_structure ──
  {
    type: "function",
    function: {
      name: "suggest_directory_structure",
      description:
        "Suggest an ECF-compliant directory structure reorganization for a research repository. Use when the user has a messy repo and wants it restructured following ECF conventions (work/, input/, output/, claim/, source/, test/, case/, document/).",
      parameters: {
        type: "object",
        properties: {
          current_structure: {
            type: "string",
            description:
              "The current directory structure or file listing, one item per line.",
          },
          project_description: {
            type: "string",
            description:
              "Optional short description of the research project to guide the suggestion.",
          },
        },
        required: ["current_structure"],
      },
    },
  },
];

// ═══════════════════════════════════════════
// Tool Executors (Lab 0 style: placeholder / simulation)
// ═══════════════════════════════════════════

interface ToolArgs {
  [key: string]: string | undefined;
}

export function executeAnnotateArtifact(args: ToolArgs): string {
  const name = args.artifact_name || "(unspecified)";
  const type = args.artifact_type || "(unspecified)";
  const desc = args.description ? ` — ${args.description}` : "";
  return `[EOP] Annotated artifact "${name}" as ${type}${desc}. Recorded in evidence chain.`;
}

export function executeLinkToClaim(args: ToolArgs): string {
  const artifact = args.artifact_name || "(artifact)";
  const claim = args.claim_text || "(claim)";
  const linkType = args.link_type || "supports";
  return `[EOP] Linked "${artifact}" → claim: "${claim}" (relationship: ${linkType}). Evidence link recorded.`;
}

export function executeClassifyRepoArtifacts(args: ToolArgs): string {
  const fileList = args.file_list || "";
  const lines = fileList
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return "[EOP] No files provided to classify. Please provide a list of file paths.";
  }

  // Return a structured prompt for the LLM to fill in via its response
  return (
    `[EOP] Classifying ${lines.length} items against ECF artifact types:\n\n` +
    `The seven ECF types are:\n` +
    `1. input_data — Raw or preprocessed inputs\n` +
    `2. experimental_process — Code that transforms input → output\n` +
    `3. output_data — Intermediate or final computed results\n` +
    `4. visual_data — Data prepared for visualization\n` +
    `5. plotting_process — Code producing figures/tables/stats\n` +
    `6. visual_claims — Figures/tables/statistics in papers\n` +
    `7. documentation — README, entry doc, descriptions\n\n` +
    `Files to classify:\n${lines.map((l) => `  - ${l}`).join("\n")}\n\n` +
    `Please provide classification results based on the file names and descriptions above.`
  );
}

export function executeAdviseDisclosureScope(args: ToolArgs): string {
  const claim = args.claim_description || "(no claim provided)";
  return (
    `[EOP] Analyzing disclosure scope for claim: "${claim}"\n\n` +
    `Claim strength categories:\n` +
    `- Existential: "We can do X" — single instance or possibility\n` +
    `- Distributional: "We reliably do X" — generalization, stability, repeated results\n\n` +
    `Disclosure scope levels:\n` +
    `- Minimal: One runnable path, key code, one reported result\n` +
    `- Standard: Code + data + docs for independent reproduction\n` +
    `- Full: Everything for reliability assessment (multiple runs, seeds, environment)\n\n` +
    `Rule: Stronger claims → broader disclosure.\n\n` +
    `Please analyze the claim strength and recommend appropriate disclosure scope.`
  );
}

export function executeSuggestDirectoryStructure(args: ToolArgs): string {
  const structure = args.current_structure || "(none provided)";
  const desc = args.project_description
    ? `\nProject: ${args.project_description}`
    : "";
  return (
    `[EOP] Suggesting ECF-compliant directory structure.${desc}\n\n` +
    `Current structure:\n${structure}\n\n` +
    `ECF recommended directories:\n` +
    `  work/     — Working files and scripts\n` +
    `  input/    — Raw input data\n` +
    `  output/   — Computed results\n` +
    `  claim/    — Visual claims (figures, tables)\n` +
    `  source/   — Source code\n` +
    `  test/     — Tests\n` +
    `  case/     — Case studies / examples\n` +
    `  document/ — Entry document and per-step docs\n\n` +
    `Please suggest how to reorganize the files into this structure.`
  );
}

/** Execute a tool by name with the given parsed arguments. */
export function executeTool(
  toolName: string,
  args: Record<string, unknown>
): string {
  const strArgs: ToolArgs = {};
  for (const [k, v] of Object.entries(args)) {
    strArgs[k] = typeof v === "string" ? v : JSON.stringify(v);
  }

  switch (toolName) {
    case "annotate_artifact":
      return executeAnnotateArtifact(strArgs);
    case "link_to_claim":
      return executeLinkToClaim(strArgs);
    case "classify_repo_artifacts":
      return executeClassifyRepoArtifacts(strArgs);
    case "advise_disclosure_scope":
      return executeAdviseDisclosureScope(strArgs);
    case "suggest_directory_structure":
      return executeSuggestDirectoryStructure(strArgs);
    default:
      return `[EOP] Unknown tool: ${toolName}`;
  }
}
