/**
 * Planner Domain — Plan
 *
 * Core data models for the Planner module.
 * This file has ZERO external imports — pure domain types.
 *
 * Rules:
 *  - No imports from services, infrastructure, or Electron.
 *  - All types here are stable contracts used across all Planner layers.
 */

// ---------------------------------------------------------------------------
// Step & Plan classification types
// ---------------------------------------------------------------------------

/** What kind of capability/tool a step requires to execute */
export type StepType =
  | 'filesystem'    // File / folder read-write operations
  | 'terminal'      // Shell command execution
  | 'browser'       // Web browser automation
  | 'memory'        // Memory store / recall operations
  | 'search'        // Information retrieval
  | 'vision'        // Image / screenshot analysis
  | 'voice'         // Audio input / output
  | 'analysis'      // Reasoning, parsing, planning sub-tasks
  | 'verification'  // Validation / sanity-check steps
  | 'output';       // Returning results to the user

/** Lifecycle state of a single step */
export type StepStatus =
  | 'pending'     // Not yet started, waiting for dependencies
  | 'ready'       // All dependencies met, can start now
  | 'running'     // Actively being executed
  | 'completed'   // Finished successfully
  | 'failed'      // Finished with an error
  | 'skipped';    // Bypassed (e.g. optional step, condition not met)

/** Lifecycle state of the whole plan */
export type PlanStatus =
  | 'draft'       // Just assembled, not yet dispatched
  | 'ready'       // Dispatched to port, awaiting Executor
  | 'running'     // Executor is actively running steps
  | 'completed'   // All required steps finished
  | 'failed'      // One or more critical steps failed
  | 'cancelled';  // Cancelled before completion

/** Coarse complexity estimate based on number of steps */
export type PlanComplexity = 'trivial' | 'simple' | 'moderate' | 'complex';

// ---------------------------------------------------------------------------
// PlanStep — a single unit of work within a Plan
// ---------------------------------------------------------------------------

export interface PlanStep {
  /** Numeric string ID, e.g. "1", "2" — unique within the plan */
  id: string;

  /** What kind of tool/capability this step needs */
  type: StepType;

  /** Short display label shown in the UI (≤ 50 chars) */
  label: string;

  /** Full human-readable description of what this step does */
  description: string;

  /**
   * IDs of steps that MUST be completed before this one can start.
   * Empty array = no dependencies (can start immediately).
   */
  dependencies: string[];

  /** Current lifecycle status */
  status: StepStatus;

  /** Estimated execution time in seconds */
  estimatedSeconds: number;

  /** Set by the Executor on successful completion */
  result?: string;

  /** Set by the Executor on failure */
  error?: string;

  /** ISO 8601 timestamp — set when step begins running */
  startedAt?: string;

  /** ISO 8601 timestamp — set when step finishes (success or failure) */
  completedAt?: string;
}

// ---------------------------------------------------------------------------
// Plan — the primary output of the Planner
// ---------------------------------------------------------------------------

export interface Plan {
  /** Globally unique plan identifier */
  id: string;

  /** The original goal/request string that generated this plan */
  goal: string;

  /** ID of the Intent from the Brain that triggered this plan (if any) */
  intentId?: string;

  /** The Brain's classified action type (e.g. 'execute_task', 'file_op') */
  intentAction?: string;

  /** Ordered list of steps — execution order respects dependencies */
  steps: PlanStep[];

  /** Current lifecycle status of the whole plan */
  status: PlanStatus;

  /** Coarse complexity classification based on step count */
  complexity: PlanComplexity;

  /** Total estimated duration = sum of all step estimates (seconds) */
  estimatedSeconds: number;

  /** Searchable tags derived from goal content and intent action */
  tags: string[];

  /** ISO 8601 creation timestamp */
  createdAt: string;

  /** ISO 8601 last-updated timestamp */
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Factory helpers — assemble domain objects consistently
// ---------------------------------------------------------------------------

/**
 * Creates a single PlanStep with all required fields and default status.
 */
export function createPlanStep(
  id: string,
  type: StepType,
  label: string,
  description: string,
  estimatedSeconds: number,
  dependencies: string[] = []
): PlanStep {
  return {
    id,
    type,
    label,
    description,
    dependencies,
    status: 'pending',
    estimatedSeconds,
  };
}

/**
 * Derives a PlanComplexity label from the number of steps.
 */
export function computeComplexity(steps: PlanStep[]): PlanComplexity {
  const n = steps.length;
  if (n <= 2) return 'trivial';
  if (n <= 4) return 'simple';
  if (n <= 7) return 'moderate';
  return 'complex';
}

/**
 * Assembles a complete Plan value object.
 */
export function createPlan(
  goal: string,
  steps: PlanStep[],
  tags: string[] = [],
  intentId?: string,
  intentAction?: string
): Plan {
  const now = new Date().toISOString();
  return {
    id: generatePlanId(),
    goal,
    intentId,
    intentAction,
    steps,
    status: 'draft',
    complexity: computeComplexity(steps),
    estimatedSeconds: steps.reduce((sum, s) => sum + s.estimatedSeconds, 0),
    tags,
    createdAt: now,
    updatedAt: now,
  };
}

function generatePlanId(): string {
  return `plan_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
}
