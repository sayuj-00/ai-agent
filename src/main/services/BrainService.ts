/**
 * services/BrainService.ts — Backward Compatibility Shim
 *
 * The Brain has been refactored into a clean-architecture module at:
 *   src/main/brain/
 *
 * This file re-exports the new BrainService so that all existing
 * import paths (AppController, ipcHandlers, etc.) continue to work
 * without modification.
 *
 * DO NOT add new logic here — use src/main/brain/BrainService.ts.
 */
export { BrainService } from '../brain/BrainService.js';
export type { Intent, IntentAction, ConfidenceTier, IBrainPort } from '../brain/BrainService.js';
