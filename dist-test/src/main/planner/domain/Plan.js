"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPlanStep = createPlanStep;
exports.computeComplexity = computeComplexity;
exports.createPlan = createPlan;
// ---------------------------------------------------------------------------
// Factory helpers — assemble domain objects consistently
// ---------------------------------------------------------------------------
/**
 * Creates a single PlanStep with all required fields and default status.
 */
function createPlanStep(id, type, label, description, estimatedSeconds, dependencies = []) {
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
function computeComplexity(steps) {
    const n = steps.length;
    if (n <= 2)
        return 'trivial';
    if (n <= 4)
        return 'simple';
    if (n <= 7)
        return 'moderate';
    return 'complex';
}
/**
 * Assembles a complete Plan value object.
 */
function createPlan(goal, steps, tags = [], intentId, intentAction) {
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
function generatePlanId() {
    return `plan_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
}
