/**
 * Brain Application Layer — BrainUseCase
 *
 * This is the single application-layer use case for the Brain module.
 * It orchestrates the full intent-processing pipeline:
 *
 *   raw text → IntentParser → Intent → IBrainPort → (Planner / other)
 *
 * Rules (Clean Architecture):
 *  - Imports ONLY from domain/ and infrastructure/ (IntentParser).
 *  - Has NO knowledge of Electron, IPC, LogService, or PlannerService.
 *  - All side-effects are delegated through the IBrainPort interface.
 *  - Fully testable in isolation — all dependencies are injected.
 */

import { Intent, createIntent } from '../domain/Intent.js';
import type { IBrainPort } from '../domain/IBrainPort.js';
import { IntentParser } from '../infrastructure/IntentParser.js';

export class BrainUseCase {
  constructor(
    private readonly parser: IntentParser,
    private readonly port: IBrainPort
  ) {}

  /**
   * Processes a raw natural language input string.
   *
   * Steps:
   * 1. Parse the input into a classified action + confidence + parameters.
   * 2. Assemble a typed Intent value object.
   * 3. Send it through the output port (non-blocking delegation).
   * 4. Return the Intent to the caller (for response rendering, logging, etc.).
   *
   * @param rawInput - The unmodified text from the user.
   * @returns The fully populated Intent.
   */
  public async process(rawInput: string): Promise<Intent> {
    if (!rawInput || rawInput.trim().length === 0) {
      return createIntent('unknown', rawInput, 0.0, { reason: 'empty_input' });
    }

    // Step 1: Parse natural language → structured fields
    const parsed = this.parser.parse(rawInput);

    // Step 2: Assemble Intent value object
    const intent = createIntent(
      parsed.action,
      rawInput,
      parsed.confidence,
      parsed.parameters
    );

    // Step 3: Dispatch to output port — Brain's job ends here.
    // We do NOT await in a way that blocks the return; the port handles
    // its own async work. We still await to propagate port errors upward.
    await this.port.receiveIntent(intent);

    // Step 4: Return the intent so the caller can use it
    return intent;
  }
}
