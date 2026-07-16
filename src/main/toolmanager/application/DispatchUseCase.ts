/**
 * Tool Manager Application Layer — DispatchUseCase
 *
 * The ONLY routing logic in the entire Tool Manager.
 *
 * Flow:
 *   ToolRequest → HandlerRegistry.resolve(stepType) → IToolHandler.handle() → ToolResult
 *
 * Rules (Clean Architecture):
 *  - Only imports from domain/ and registry/.
 *  - Has ZERO knowledge of BrowserController, FileManager, or any concrete service.
 *  - Has NO business logic — it only delegates.
 *  - Never throws — always returns a ToolResult.
 *  - Fully testable with a mock HandlerRegistry.
 */

import type { ToolRequest } from '../domain/ToolRequest.js';
import type { ToolResult } from '../domain/ToolResult.js';
import { createToolResult } from '../domain/ToolResult.js';
import type { HandlerRegistry } from '../registry/HandlerRegistry.js';

export class DispatchUseCase {
  constructor(private readonly registry: HandlerRegistry) {}

  /**
   * Route a ToolRequest to the correct handler and return the result.
   *
   * Steps:
   * 1. Look up the handler for request.stepType in the registry.
   * 2. If none found, return a 'not_implemented' ToolResult.
   * 3. Call handler.handle(request).
   * 4. If handler throws (should not happen per contract), catch and return 'failure'.
   * 5. Return the ToolResult from the handler.
   */
  public async dispatch(request: ToolRequest): Promise<ToolResult> {
    const handler = this.registry.resolve(request.stepType);

    // No handler registered for this step type
    if (!handler) {
      return createToolResult(
        request.stepId,
        request.planId,
        'DispatchUseCase',
        'not_implemented',
        0,
        undefined,
        `No handler registered for step type: "${request.stepType}". ` +
        `Register a handler that declares supportedTypes includes "${request.stepType}".`
      );
    }

    // Delegate entirely — DispatchUseCase does nothing else
    const start = Date.now();
    try {
      return await handler.handle(request);
    } catch (error: unknown) {
      // Defensive catch — handlers should not throw, but guard against it
      const msg = error instanceof Error ? error.message : String(error);
      return createToolResult(
        request.stepId,
        request.planId,
        handler.name,
        'failure',
        Date.now() - start,
        undefined,
        `Handler "${handler.name}" threw unexpectedly: ${msg}`
      );
    }
  }
}
