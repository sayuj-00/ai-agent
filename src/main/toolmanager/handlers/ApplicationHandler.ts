/**
 * Tool Manager Handler — ApplicationHandler
 *
 * Routes 'analysis' and 'output' PlanSteps.
 *
 * These step types don't map to a single service — they represent:
 *   analysis → Reasoning/planning sub-steps (currently acknowledged; will route to LLM)
 *   output   → Delivering results to the user (returns the step description as output)
 *
 * Also handles future app-launching steps (VS Code, terminals, IDEs).
 *
 * Rules:
 *  - Zero business logic — only acknowledgment + delegation.
 *  - Always returns a ToolResult, never throws.
 *  - When an LLM reasoning service is added, this handler routes to it.
 */

import type { IToolHandler } from '../domain/IToolHandler.js';
import type { ToolRequest } from '../domain/ToolRequest.js';
import type { ToolResult } from '../domain/ToolResult.js';
import { createToolResult } from '../domain/ToolResult.js';
import type { StepType } from '../../planner/domain/Plan.js';
import { LogService } from '../../services/LogService.js';

export class ApplicationHandler implements IToolHandler {
  readonly name = 'ApplicationHandler';
  readonly supportedTypes: StepType[] = ['analysis', 'output'];

  private readonly logger = LogService.getInstance();

  public async handle(request: ToolRequest): Promise<ToolResult> {
    const start = Date.now();
    this.logger.info('ApplicationHandler', `▶ [${request.stepType}] "${request.label}"`);

    try {
      switch (request.stepType) {
        case 'output':
          // Deliver the result — return description as the output
          return createToolResult(
            request.stepId, request.planId,
            this.name, 'success', Date.now() - start,
            request.description || request.label
          );

        case 'analysis':
        default: {
          // Reasoning / planning sub-step — acknowledged
          // Future: route to LLM reasoning service
          const appHint = request.parameters['app'] ?? '';
          const output = appHint
            ? `Application step: would launch "${appHint}"`
            : `Analysis step "${request.label}" processed by ApplicationHandler.`;
          return createToolResult(
            request.stepId, request.planId,
            this.name, 'success', Date.now() - start,
            output
          );
        }
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error('ApplicationHandler', `Failed: ${msg}`);
      return createToolResult(
        request.stepId, request.planId,
        this.name, 'failure', Date.now() - start,
        undefined, msg
      );
    }
  }
}
