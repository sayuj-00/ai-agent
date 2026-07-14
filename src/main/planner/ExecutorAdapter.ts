/**
 * Planner Infrastructure — ExecutorAdapter (IPlannerPort stub)
 *
 * Implements IPlannerPort as a no-op logging adapter.
 *
 * Since the Executor module is not yet built, this adapter:
 *  1. Logs the incoming Plan with full step details.
 *  2. Marks the plan as 'ready' (waiting for Executor).
 *  3. Logs each step so the Logs panel shows the full decomposition.
 *
 * When the Executor is built, it will implement IPlannerPort for real.
 * This file will be replaced. The Planner module and PlannerUseCase
 * will not require any changes.
 *
 * Architecture note:
 *  This adapter lives in the Planner module — NOT in services/ —
 *  because it is part of the Planner's outbound wiring.
 */

import type { IPlannerPort } from './domain/IPlannerPort.js';
import type { Plan } from './domain/Plan.js';
import { LogService } from '../services/LogService.js';

/** Step-type icons for readable log output */
const STEP_ICONS: Record<string, string> = {
  filesystem:   '📁',
  terminal:     '💻',
  browser:      '🌐',
  memory:       '🧠',
  search:       '🔍',
  vision:       '👁️',
  voice:        '🎙️',
  analysis:     '⚙️',
  verification: '✅',
  output:       '📤',
};

export class ExecutorAdapter implements IPlannerPort {
  private readonly logger = LogService.getInstance();

  public async onPlanReady(plan: Plan): Promise<void> {
    // Log plan summary
    this.logger.info(
      'ExecutorAdapter',
      `📋 Plan [${plan.id}] assembled — ` +
      `"${plan.goal.substring(0, 60)}${plan.goal.length > 60 ? '…' : ''}" | ` +
      `${plan.steps.length} steps | complexity=${plan.complexity} | ~${plan.estimatedSeconds}s estimated`
    );

    // Log tags if any
    if (plan.tags.length > 0) {
      this.logger.info('ExecutorAdapter', `🏷️  Tags: ${plan.tags.map(t => `[${t}]`).join(' ')}`);
    }

    // Log each step for full observability in the Logs panel
    for (const step of plan.steps) {
      const icon = STEP_ICONS[step.type] ?? '▸';
      const deps = step.dependencies.length > 0
        ? ` (after step${step.dependencies.length > 1 ? 's' : ''} ${step.dependencies.join(', ')})`
        : '';
      this.logger.info(
        'ExecutorAdapter',
        `  ${icon} Step ${step.id}: [${step.type}] ${step.label}${deps} — ~${step.estimatedSeconds}s`
      );
    }

    // Log queued status (Executor not built yet)
    this.logger.info(
      'ExecutorAdapter',
      `⏸  Plan [${plan.id}] queued — ` +
      `Executor module not yet implemented. Ready for execution when built.`
    );
  }
}
