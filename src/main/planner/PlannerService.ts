/**
 * Planner Module — PlannerService (Public Facade)
 *
 * Single public entry point for the entire Planner module.
 * Assembles the dependency graph and exposes a clean, minimal API.
 *
 * Dependency graph (wired here):
 *
 *   PlannerService
 *     └── PlannerUseCase           (application layer)
 *           ├── TaskDecomposer     (infrastructure — pure template engine)
 *           └── ExecutorAdapter    (infrastructure — IPlannerPort stub)
 *
 * Callers (IPC handlers, Brain's PlannerAdapter) only import PlannerService.
 * They never need to know about use cases, decomposers, or adapters.
 */

import { LogService } from '../services/LogService.js';
import { TaskDecomposer } from './infrastructure/TaskDecomposer.js';
import { ExecutorAdapter } from './ExecutorAdapter.js';
import { PlannerUseCase } from './application/PlannerUseCase.js';
import type { Plan } from './domain/Plan.js';
import type { Intent } from '../brain/domain/Intent.js';

// Re-export all domain types — callers use a single import point
export type {
  Plan, PlanStep, StepType, StepStatus, PlanStatus, PlanComplexity
} from './domain/Plan.js';
export type { IPlannerPort } from './domain/IPlannerPort.js';

export class PlannerService {
  private static instance: PlannerService | null = null;
  private readonly useCase: PlannerUseCase;
  private readonly logger = LogService.getInstance();

  /** In-memory plan registry — all created plans indexed by ID */
  private readonly plans = new Map<string, Plan>();

  private constructor() {
    const decomposer = new TaskDecomposer();
    const port       = new ExecutorAdapter();
    this.useCase     = new PlannerUseCase(decomposer, port);

    this.logger.info('Planner', 'Planner module initialized (clean architecture).');
    this.logger.info('Planner', 'Pipeline: Intent/Goal → TaskDecomposer → PlannerUseCase → ExecutorAdapter');
  }

  public static getInstance(): PlannerService {
    if (!PlannerService.instance) {
      PlannerService.instance = new PlannerService();
    }
    return PlannerService.instance;
  }

  // ---------------------------------------------------------------------------
  // Primary API — Intent-aware entry point (called by Brain's PlannerAdapter)
  // ---------------------------------------------------------------------------

  /**
   * Creates a Plan from a fully structured Intent.
   * This is the preferred entry point when the Brain has processed input —
   * it passes the full context (action, parameters, intentId) to the decomposer.
   *
   * @param intent - Structured Intent produced by the Brain module.
   */
  public async createPlanFromIntent(intent: Intent): Promise<Plan> {
    this.logger.info(
      'Planner',
      `▶ Creating plan from intent [${intent.id}] action="${intent.action}" ` +
      `confidence=${(intent.confidence * 100).toFixed(0)}%`
    );

    const plan = await this.useCase.createPlan({
      goal:         intent.rawInput,
      intentAction: intent.action,
      parameters:   intent.parameters,
      intentId:     intent.id,
    });

    this.plans.set(plan.id, plan);
    this.logPlanSummary(plan);
    return plan;
  }

  // ---------------------------------------------------------------------------
  // Legacy + IPC-compatible entry point (goal string)
  // ---------------------------------------------------------------------------

  /**
   * Creates a Plan from a plain goal string.
   * Used by the IPC channel planner:create-plan (PlannerPanel UI)
   * and anywhere a structured Intent is not available.
   *
   * @param goal          - The goal string to decompose.
   * @param intentAction  - Optional action hint for template selection.
   * @param parameters    - Optional parameter slots.
   */
  public async createPlan(
    goal: string,
    intentAction?: string,
    parameters?: Record<string, string>
  ): Promise<Plan> {
    this.logger.info('Planner', `▶ Creating plan for goal: "${goal.substring(0, 60)}${goal.length > 60 ? '…' : ''}"`);

    const plan = await this.useCase.createPlan({ goal, intentAction, parameters });
    this.plans.set(plan.id, plan);
    this.logPlanSummary(plan);
    return plan;
  }

  // ---------------------------------------------------------------------------
  // Plan registry queries
  // ---------------------------------------------------------------------------

  /** Retrieve a single plan by its ID. Returns undefined if not found. */
  public getPlan(id: string): Plan | undefined {
    return this.plans.get(id);
  }

  /** List all plans, most-recent first. */
  public listPlans(): Plan[] {
    return [...this.plans.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Cancel a plan by ID.
   * Running plans cannot be cancelled (Executor would need to be interrupted).
   */
  public cancelPlan(id: string): Plan | undefined {
    const plan = this.plans.get(id);
    if (!plan) {
      this.logger.warn('Planner', `cancelPlan: Plan [${id}] not found.`);
      return undefined;
    }
    if (plan.status === 'running') {
      this.logger.warn('Planner', `Cannot cancel plan [${id}] — currently running.`);
      return plan;
    }
    plan.status    = 'cancelled';
    plan.updatedAt = new Date().toISOString();
    this.logger.info('Planner', `Plan [${id}] cancelled.`);
    return { ...plan };
  }

  // ---------------------------------------------------------------------------
  // UI compatibility — step state simulation (used by PlannerPanel)
  // ---------------------------------------------------------------------------

  /**
   * Simulates step execution state changes for the UI.
   *
   * NOTE: The Planner does NOT actually execute steps.
   * This method exists solely so the PlannerPanel UI can demonstrate
   * step progression while the Executor module is not yet built.
   * It will be removed when the Executor is implemented.
   *
   * @deprecated Will be removed when Executor module is built.
   */
  public async runStep(planId: string, stepId: string): Promise<Plan> {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error(`Plan [${planId}] not found.`);

    const step = plan.steps.find(s => s.id === stepId);
    if (!step) throw new Error(`Step [${stepId}] not found in Plan [${planId}].`);

    if (step.status === 'completed' || step.status === 'running') {
      this.logger.warn('Planner', `Step [${stepId}] is already ${step.status} — skipping.`);
      return { ...plan, steps: plan.steps.map(s => ({ ...s })) };
    }

    // Check dependencies are met
    const unmet = step.dependencies.filter(depId => {
      const dep = plan.steps.find(s => s.id === depId);
      return dep && dep.status !== 'completed';
    });
    if (unmet.length > 0) {
      this.logger.warn('Planner', `Step [${stepId}] has unmet dependencies: [${unmet.join(', ')}]`);
      throw new Error(`Cannot run step [${stepId}] — dependencies not met: [${unmet.join(', ')}]`);
    }

    this.logger.info('Planner', `[UI] Running step [${stepId}]: "${step.label}"`);
    step.status    = 'running';
    step.startedAt = new Date().toISOString();
    plan.status    = 'running';
    plan.updatedAt = new Date().toISOString();

    // Simulate work proportional to estimated time (capped at 1.5s for UX)
    const delay = Math.min(step.estimatedSeconds * 100, 1500) + Math.random() * 300;
    await new Promise(resolve => setTimeout(resolve, delay));

    step.status      = 'completed';
    step.completedAt = new Date().toISOString();
    step.result      = `[${step.type}] "${step.label}" completed. (Simulated — Executor not yet built.)`;
    plan.updatedAt   = new Date().toISOString();

    // Check if the entire plan is now complete
    const allDone = plan.steps.every(s => s.status === 'completed' || s.status === 'skipped');
    if (allDone) {
      plan.status = 'completed';
      this.logger.info('Planner', `✔ All steps in Plan [${planId}] completed.`);
    }

    this.logger.info('Planner', `[UI] Step [${stepId}] "${step.label}" → completed`);
    return { ...plan, steps: plan.steps.map(s => ({ ...s })) };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private logPlanSummary(plan: Plan): void {
    this.logger.info(
      'Planner',
      `✔ Plan [${plan.id}] ready — ${plan.steps.length} steps | ` +
      `complexity=${plan.complexity} | ~${plan.estimatedSeconds}s` +
      (plan.tags.length ? ` | tags=[${plan.tags.join(', ')}]` : '')
    );
  }
}
