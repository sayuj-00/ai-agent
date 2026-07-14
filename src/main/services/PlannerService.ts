/**
 * services/PlannerService.ts — Backward Compatibility Shim
 *
 * The Planner has been refactored into a clean-architecture module at:
 *   src/main/planner/
 *
 * This file re-exports the new PlannerService so that all existing
 * import paths (AppController, ipcHandlers, etc.) continue to work
 * without modification.
 *
 * DO NOT add new logic here — use src/main/planner/PlannerService.ts.
 */
export { PlannerService } from '../planner/PlannerService.js';
export type {
  Plan, PlanStep, StepType, StepStatus, PlanStatus, PlanComplexity, IPlannerPort
} from '../planner/PlannerService.js';
