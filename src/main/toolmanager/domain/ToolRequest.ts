/**
 * Tool Manager Domain — ToolRequest
 *
 * The input contract the Tool Manager receives from the Planner.
 * Carries everything a handler needs to do its job — no more, no less.
 *
 * Rules:
 *  - Only imports from Planner's domain (StepType) — still a pure type file.
 *  - No imports from services, handlers, or Electron.
 */

import type { StepType } from '../../planner/domain/Plan.js';

export interface ToolRequest {
  /** ID of the PlanStep this request originates from */
  stepId: string;

  /** ID of the Plan this step belongs to */
  planId: string;

  /**
   * The step type — this is what the Tool Manager uses to route.
   * e.g. 'terminal' → TerminalHandler, 'browser' → BrowserHandler
   */
  stepType: StepType;

  /** Short display label (from PlanStep.label) */
  label: string;

  /** Full description of what this step should accomplish */
  description: string;

  /**
   * Extracted parameter slots from the Intent / Plan.
   * Handler-specific keys, e.g.:
   *   terminal    → { command: "pip install -r requirements.txt" }
   *   filesystem  → { path: "/my/file.txt", operation: "read" }
   *   browser     → { url: "https://github.com" }
   *   memory      → { content: "...", category: "project" }
   *   vision      → { path: "/screenshot.png" }
   *   voice       → { text: "Hello world" }
   */
  parameters: Record<string, string>;
}

/** Factory helper — build a ToolRequest from a PlanStep */
export function createToolRequest(
  planId: string,
  stepId: string,
  stepType: StepType,
  label: string,
  description: string,
  parameters: Record<string, string> = {}
): ToolRequest {
  return { stepId, planId, stepType, label, description, parameters };
}
