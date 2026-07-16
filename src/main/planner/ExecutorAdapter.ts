/**
 * Planner Infrastructure — ExecutorAdapter (IPlannerPort implementation)
 *
 * Implements IPlannerPort — the Planner's output port.
 * When PlannerUseCase calls onPlanReady(plan), this adapter:
 *
 *  1. Logs the full plan decomposition (step types, labels, estimates).
 *  2. Dispatches each step to the Tool Manager via ToolManagerService.dispatchStep().
 *  3. Steps execute sequentially in dependency order.
 *  4. Results are logged for full observability in the Logs panel.
 *
 * Architecture:
 *  - Lives in the Planner module (Planner's outbound wiring).
 *  - Is the ONLY place Planner + Tool Manager touch.
 *  - Planner domain/application layers have ZERO knowledge of ToolManagerService.
 *  - When a proper Executor module is built, replace this file — nothing else changes.
 */

import type { IPlannerPort } from './domain/IPlannerPort.js';
import type { Plan, PlanStep } from './domain/Plan.js';
import { LogService } from '../services/LogService.js';
import { ToolManagerService } from '../toolmanager/ToolManagerService.js';

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
  private readonly logger      = LogService.getInstance();
  private readonly toolManager = ToolManagerService.getInstance();

  public async onPlanReady(plan: Plan): Promise<void> {
    // ── 1. Log plan summary ──────────────────────────────────────────────────
    this.logger.info(
      'ExecutorAdapter',
      `📋 Plan [${plan.id}] received — ` +
      `"${plan.goal.substring(0, 60)}${plan.goal.length > 60 ? '…' : ''}" | ` +
      `${plan.steps.length} steps | complexity=${plan.complexity} | ~${plan.estimatedSeconds}s`
    );

    if (plan.tags.length > 0) {
      this.logger.info('ExecutorAdapter', `🏷️  Tags: ${plan.tags.map(t => `[${t}]`).join(' ')}`);
    }

    // ── 2. Log step manifest ─────────────────────────────────────────────────
    for (const step of plan.steps) {
      const icon = STEP_ICONS[step.type] ?? '▸';
      const deps = step.dependencies.length > 0
        ? ` → after [${step.dependencies.join(', ')}]`
        : '';
      this.logger.info(
        'ExecutorAdapter',
        `  ${icon} Step ${step.id}: [${step.type}] ${step.label}${deps} ~${step.estimatedSeconds}s`
      );
    }

    // ── 3. Dispatch each step sequentially through the Tool Manager ──────────
    this.logger.info('ExecutorAdapter', `▶ Dispatching ${plan.steps.length} steps to Tool Manager…`);

    for (const step of plan.steps) {
      await this.dispatchStep(plan, step);
    }

    // ── 4. Plan complete ─────────────────────────────────────────────────────
    this.logger.info(
      'ExecutorAdapter',
      `✔ Plan [${plan.id}] dispatched — all steps sent to Tool Manager.`
    );
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async dispatchStep(plan: Plan, step: PlanStep): Promise<void> {
    const icon = STEP_ICONS[step.type] ?? '▸';

    try {
      const result = await this.toolManager.dispatchStep(plan.id, step);

      if (result.status === 'success') {
        this.logger.info(
          'ExecutorAdapter',
          `  ${icon} Step ${step.id} ✔ [${result.handlerName}] ${result.durationMs}ms` +
          (result.output ? ` — ${result.output.substring(0, 80)}${result.output.length > 80 ? '…' : ''}` : '')
        );
      } else if (result.status === 'not_implemented') {
        this.logger.warn(
          'ExecutorAdapter',
          `  ${icon} Step ${step.id} ⚠ [${step.type}] No handler registered — skipping.`
        );
      } else {
        this.logger.error(
          'ExecutorAdapter',
          `  ${icon} Step ${step.id} ✖ [${result.handlerName}] Failed: ${result.error}`
        );
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        'ExecutorAdapter',
        `  ${icon} Step ${step.id} ✖ Unexpected error: ${msg}`
      );
    }
  }
}
