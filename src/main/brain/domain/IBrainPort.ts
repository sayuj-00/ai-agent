/**
 * Brain Domain — IBrainPort (Output Port)
 *
 * This is the Brain's ONLY outbound communication interface.
 * Any module that wants to receive intents from the Brain MUST
 * implement this interface.
 *
 * Rules:
 *  - Only imports from the domain layer (Intent).
 *  - The Brain's application layer depends on this interface,
 *    NOT on any concrete implementation (PlannerService, etc.).
 *  - Implementations live in the infrastructure layer (e.g. PlannerAdapter).
 */

import type { Intent } from './Intent.js';

export interface IBrainPort {
  /**
   * Called by the Brain when it has fully parsed a user input into
   * a structured Intent. The implementor decides what to do with it
   * (e.g. create a Plan, log it, route it, etc.).
   *
   * @param intent - The classified and parameterised intent.
   * @returns A promise that resolves when the intent has been accepted.
   */
  receiveIntent(intent: Intent): Promise<void>;
}
