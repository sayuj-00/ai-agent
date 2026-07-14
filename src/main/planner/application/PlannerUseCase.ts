/**
 * Planner Application Layer — PlannerUseCase
 *
 * Orchestrates the full plan-generation pipeline:
 *
 *   goal + context → TaskDecomposer → steps → Plan → IPlannerPort
 *
 * Rules (Clean Architecture):
 *  - Imports ONLY from domain/ and infrastructure/ (TaskDecomposer).
 *  - Has NO knowledge of Electron, IPC, LogService, PlannerService, or any service.
 *  - All side-effects (logging, queuing) are delegated through IPlannerPort.
 *  - Fully testable in isolation — all dependencies are constructor-injected.
 */

import { Plan, createPlan } from '../domain/Plan.js';
import type { IPlannerPort } from '../domain/IPlannerPort.js';
import { TaskDecomposer } from '../infrastructure/TaskDecomposer.js';

// ---------------------------------------------------------------------------
// Input contract for the use case
// ---------------------------------------------------------------------------

export interface PlanRequest {
  /** The raw user goal string (Intent.rawInput or a plain goal) */
  goal: string;

  /** The Brain's classified action type — drives template selection */
  intentAction?: string;

  /** Extracted parameter slots from the Intent (path, url, command, etc.) */
  parameters?: Record<string, string>;

  /** ID of the originating Intent (for traceability) */
  intentId?: string;
}

// ---------------------------------------------------------------------------
// PlannerUseCase
// ---------------------------------------------------------------------------

export class PlannerUseCase {
  constructor(
    private readonly decomposer: TaskDecomposer,
    private readonly port: IPlannerPort
  ) {}

  /**
   * Creates a Plan from a request descriptor.
   *
   * Steps:
   * 1. Decompose the goal into ordered, typed PlanSteps.
   * 2. Derive tags from goal keywords and intentAction.
   * 3. Assemble the Plan value object.
   * 4. Dispatch through the output port (Planner's job ends here).
   * 5. Return the Plan to the caller.
   *
   * @param request - PlanRequest with goal and optional context.
   * @returns The fully assembled Plan.
   */
  public async createPlan(request: PlanRequest): Promise<Plan> {
    const { goal, intentAction, parameters = {}, intentId } = request;

    // Step 1: Decompose into ordered steps using the template engine
    const steps = this.decomposer.decompose(goal, intentAction, parameters);

    // Step 2: Derive searchable tags from goal content and action type
    const tags = this.deriveTags(goal, intentAction);

    // Step 3: Assemble the Plan domain object
    const plan = createPlan(goal, steps, tags, intentId, intentAction);

    // Step 4: Dispatch to the output port — Planner's responsibility ends here.
    // The Executor (when built) will receive this and queue it for execution.
    await this.port.onPlanReady(plan);

    // Step 5: Return to caller for logging / IPC response
    return plan;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Derives a deduplicated set of searchable tags from the goal and action. */
  private deriveTags(goal: string, intentAction?: string): string[] {
    const tags: string[] = [];

    // Tag from intent action
    if (intentAction && intentAction !== 'execute_task') {
      tags.push(intentAction.replace('_', '-'));
    }

    // Keyword-based technology tags
    const keywordMap: [RegExp, string][] = [
      [/\bpython\b/i,                     'python'],
      [/\bjavascript|typescript|node\b/i, 'javascript'],
      [/\breact\b/i,                      'react'],
      [/\bvue\b/i,                        'vue'],
      [/\bangular\b/i,                    'angular'],
      [/\bnext\.?js\b/i,                  'nextjs'],
      [/\bvite\b/i,                       'vite'],
      [/\bapi|rest|graphql\b/i,           'api'],
      [/\bdocker|container\b/i,           'docker'],
      [/\bgit\b/i,                        'git'],
      [/\btest|spec|coverage\b/i,         'testing'],
      [/\bdatabase|sql|mongo|postgres\b/i,'database'],
      [/\brefactor|clean\b/i,             'refactor'],
      [/\bauth|jwt|oauth\b/i,             'auth'],
    ];

    for (const [pattern, tag] of keywordMap) {
      if (pattern.test(goal)) tags.push(tag);
    }

    // Deduplicate
    return [...new Set(tags)];
  }
}
