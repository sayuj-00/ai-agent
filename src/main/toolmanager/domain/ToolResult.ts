/**
 * Tool Manager Domain — ToolResult
 *
 * The output contract — what every handler returns after processing a request.
 * Pure types, zero imports.
 */

/** Outcome of a tool dispatch */
export type ToolResultStatus =
  | 'success'          // Handler completed the task successfully
  | 'failure'          // Handler encountered an error
  | 'skipped'          // Step was intentionally bypassed
  | 'not_implemented'; // No handler registered for this StepType

export interface ToolResult {
  /** Matches the incoming ToolRequest.stepId */
  stepId: string;

  /** Matches the incoming ToolRequest.planId */
  planId: string;

  /** Outcome of the dispatch */
  status: ToolResultStatus;

  /** Name of the handler that processed this request */
  handlerName: string;

  /** Human-readable output from the handler (success case) */
  output?: string;

  /** Error message (failure case) */
  error?: string;

  /** Wall-clock execution time in milliseconds */
  durationMs: number;

  /** ISO 8601 timestamp of when the result was produced */
  timestamp: string;
}

/** Factory helper — build a ToolResult consistently */
export function createToolResult(
  stepId: string,
  planId: string,
  handlerName: string,
  status: ToolResultStatus,
  durationMs: number,
  output?: string,
  error?: string
): ToolResult {
  return {
    stepId,
    planId,
    status,
    handlerName,
    output,
    error,
    durationMs,
    timestamp: new Date().toISOString(),
  };
}
