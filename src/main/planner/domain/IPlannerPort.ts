/**
 * Planner Domain — IPlannerPort (Output Port)
 *
 * This is the Planner's ONLY outbound communication interface.
 * When a Plan is fully assembled, it is dispatched through this port.
 *
 * Rules:
 *  - Only imports from domain/ (Plan types).
 *  - The Planner's application layer depends on this interface,
 *    NOT on any concrete implementation.
 *  - Implementations live in infrastructure (e.g. ExecutorAdapter).
 *  - When the Executor module is built, it will implement this port.
 */

import type { Plan } from './Plan.js';

export interface IPlannerPort {
  /**
   * Called by the Planner once a Plan is fully assembled and validated.
   *
   * The implementor decides what to do with the plan:
   *   - Queue it for execution (Executor)
   *   - Persist it (Storage)
   *   - Notify the UI (Event Bus)
   *   - Log it (Logging stub)
   *
   * The Planner does NOT call this itself; PlannerUseCase does.
   *
   * @param plan - The fully assembled Plan (status='draft').
   */
  onPlanReady(plan: Plan): Promise<void>;
}
