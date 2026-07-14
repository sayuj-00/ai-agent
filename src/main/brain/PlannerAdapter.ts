/**
 * Brain Infrastructure — PlannerAdapter (IBrainPort implementation)
 *
 * This is the ONLY place where the Brain module and the Planner module touch.
 * It implements IBrainPort so the Brain can dispatch intents without knowing
 * anything about PlannerService.
 *
 * Responsibility:
 *  - Receive an Intent from the Brain.
 *  - Decide whether the intent warrants a Plan.
 *  - Translate the Intent into a Planner call (createPlan).
 *  - Log the handoff for observability.
 *
 * This adapter lives in the Brain module's own directory, not in services/,
 * because it is part of the Brain's outbound wiring — it belongs to the Brain.
 */

import type { IBrainPort } from './domain/IBrainPort.js';
import type { Intent } from './domain/Intent.js';
// Import through the shim so the path stays stable
import { PlannerService } from '../services/PlannerService.js';
import { LogService } from '../services/LogService.js';

/**
 * Actions that produce actual work — these get a Plan created in the Planner.
 * Conversational intents (chat) and low-confidence classifications are skipped.
 */
const PLANNABLE_ACTIONS = new Set<string>([
  'execute_task',
  'file_op',
  'run_command',
  'browse_web',
  'analyze_image',
  'remember',
  'recall',
  'search'
]);

export class PlannerAdapter implements IBrainPort {
  private readonly planner = PlannerService.getInstance();
  private readonly logger = LogService.getInstance();

  /**
   * Receives a classified Intent and decides what to do with it:
   *
   * - If it's a plannable action with sufficient confidence → create a Plan.
   * - If it's conversational or low-confidence → log and skip.
   * - If it's unknown → warn and skip.
   */
  public async receiveIntent(intent: Intent): Promise<void> {
    this.logger.info(
      'PlannerAdapter',
      `Received intent [${intent.id}] → action="${intent.action}" ` +
      `confidence=${(intent.confidence * 100).toFixed(0)}% (${intent.confidenceTier})`
    );

    // Reject completely unclassified intents
    if (intent.action === 'unknown') {
      this.logger.warn(
        'PlannerAdapter',
        `Intent [${intent.id}] has action=unknown — no plan dispatched.`
      );
      return;
    }

    // Skip chat intents — these are handled by the response layer, not the Planner
    if (intent.action === 'chat') {
      this.logger.info(
        'PlannerAdapter',
        `Intent [${intent.id}] is conversational — Planner not required.`
      );
      return;
    }

    // Skip if confidence is below the minimum threshold
    if (intent.confidence < 0.5) {
      this.logger.warn(
        'PlannerAdapter',
        `Intent [${intent.id}] confidence too low (${intent.confidence.toFixed(2)}) — Planner not invoked.`
      );
      return;
    }

    // Dispatch to Planner if this action warrants a plan
    if (PLANNABLE_ACTIONS.has(intent.action)) {
      this.logger.info(
        'PlannerAdapter',
        `Dispatching intent [${intent.id}] to Planner (action="${intent.action}")`
      );

      try {
        // Pass the full Intent so the Planner can use action + parameters
        // for context-aware task decomposition (createPlanFromIntent)
        const plan = await this.planner.createPlanFromIntent(intent);
        this.logger.info(
          'PlannerAdapter',
          `Plan [${plan.id}] created for intent [${intent.id}] — ` +
          `${plan.steps.length} steps | complexity=${plan.complexity}`
        );
      } catch (error: any) {
        this.logger.error(
          'PlannerAdapter',
          `Failed to create plan for intent [${intent.id}]: ${error.message}`
        );
        throw error;
      }
    }
  }

  /**
   * Formats a human-readable goal string from an Intent.
   * The Planner uses this as the description of what needs to be done.
   */
  private buildPlanGoal(intent: Intent): string {
    const actionLabel = intent.action.replace('_', ' ').toUpperCase();
    const context = this.buildContext(intent);
    return context
      ? `[${actionLabel}] ${intent.rawInput} | Context: ${context}`
      : `[${actionLabel}] ${intent.rawInput}`;
  }

  /**
   * Summarises extracted parameters into a short context string.
   */
  private buildContext(intent: Intent): string {
    const { parameters } = intent;
    const parts: string[] = [];

    if (parameters['url'])       parts.push(`url=${parameters['url']}`);
    if (parameters['path'])      parts.push(`path=${parameters['path']}`);
    if (parameters['operation']) parts.push(`op=${parameters['operation']}`);
    if (parameters['command'])   parts.push(`cmd=${parameters['command']}`);
    if (parameters['query'])     parts.push(`query=${parameters['query']}`);
    if (parameters['content'])   parts.push(`content="${parameters['content']}"`);

    return parts.join(', ');
  }
}
