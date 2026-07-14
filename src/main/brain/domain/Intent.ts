/**
 * Brain Domain — Intent
 *
 * This is the core data contract produced by the Brain module.
 * It represents structured understanding of a raw user input.
 *
 * Rules:
 *  - This file has ZERO external imports (pure domain).
 *  - It must never import from services, controllers, or infrastructure.
 */

// ---------------------------------------------------------------------------
// Intent Action — every possible thing the brain can classify a request as
// ---------------------------------------------------------------------------
export type IntentAction =
  | 'chat'           // General conversation / question-answering
  | 'search'         // Lookup / research request
  | 'execute_task'   // Multi-step task needing a plan (create, build, code)
  | 'file_op'        // File system operation (read, write, list)
  | 'run_command'    // Terminal / shell command execution
  | 'browse_web'     // Browser navigation / web automation
  | 'analyze_image'  // Vision / image understanding task
  | 'remember'       // Store information into memory
  | 'recall'         // Retrieve information from memory
  | 'unknown';       // Could not classify with enough confidence

// ---------------------------------------------------------------------------
// Confidence tier — semantic label over the raw 0-1 score
// ---------------------------------------------------------------------------
export type ConfidenceTier = 'high' | 'medium' | 'low' | 'none';

export function getConfidenceTier(score: number): ConfidenceTier {
  if (score >= 0.8) return 'high';
  if (score >= 0.5) return 'medium';
  if (score > 0.0)  return 'low';
  return 'none';
}

// ---------------------------------------------------------------------------
// Intent — the primary output of the Brain
// ---------------------------------------------------------------------------
export interface Intent {
  /** Unique identifier for this intent instance */
  id: string;

  /** Classified action type */
  action: IntentAction;

  /** The original unmodified user input */
  rawInput: string;

  /** Classification confidence score: 0.0 (none) → 1.0 (certain) */
  confidence: number;

  /** Human-readable confidence tier */
  confidenceTier: ConfidenceTier;

  /**
   * Extracted parameter slots from the input.
   * Keys depend on the action type, e.g.:
   *   browse_web  → { url: "https://..." }
   *   file_op     → { path: "/some/file.txt", operation: "read" }
   *   run_command → { command: "ls -la" }
   *   remember    → { content: "..." }
   */
  parameters: Record<string, string>;

  /** ISO 8601 timestamp when this intent was created */
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Factory helper — assembles an Intent from parsed components
// ---------------------------------------------------------------------------
export function createIntent(
  action: IntentAction,
  rawInput: string,
  confidence: number,
  parameters: Record<string, string> = {}
): Intent {
  return {
    id: generateIntentId(),
    action,
    rawInput,
    confidence,
    confidenceTier: getConfidenceTier(confidence),
    parameters,
    timestamp: new Date().toISOString()
  };
}

function generateIntentId(): string {
  return `int_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
}
