"use strict";
/**
 * Brain Domain — Intent
 *
 * This is the core data contract produced by the Brain module.
 * It represents structured understanding of a raw user input.
 *
 * Rules:
 *  - This file has ZERO external imports (pure domain).
 *  - It must never import from services, controllers, or infrastructure.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfidenceTier = getConfidenceTier;
exports.createIntent = createIntent;
function getConfidenceTier(score) {
    if (score >= 0.8)
        return 'high';
    if (score >= 0.5)
        return 'medium';
    if (score > 0.0)
        return 'low';
    return 'none';
}
// ---------------------------------------------------------------------------
// Factory helper — assembles an Intent from parsed components
// ---------------------------------------------------------------------------
function createIntent(action, rawInput, confidence, parameters = {}) {
    return {
        id: generateIntentId(),
        action,
        rawInput,
        confidence,
        confidenceTier: getConfidenceTier(confidence),
        parameters,
        timestamp: new Date().toISOString()
    };
}
function generateIntentId() {
    return `int_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
}
