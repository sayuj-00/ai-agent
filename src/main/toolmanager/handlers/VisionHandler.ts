/**
 * Tool Manager Handler — VisionHandler
 *
 * Routes 'vision' PlanSteps to VisionService.
 *
 * Routing:
 *   path param present → VisionService.analyzeImage(path)
 *   default            → acknowledge step
 *
 * Rules:
 *  - Zero business logic — only translation + delegation.
 *  - Always returns a ToolResult, never throws.
 */

import type { IToolHandler } from '../domain/IToolHandler.js';
import type { ToolRequest } from '../domain/ToolRequest.js';
import type { ToolResult } from '../domain/ToolResult.js';
import { createToolResult } from '../domain/ToolResult.js';
import type { StepType } from '../../planner/domain/Plan.js';
import { VisionService } from '../../services/VisionService.js';
import { LogService } from '../../services/LogService.js';

export class VisionHandler implements IToolHandler {
  readonly name = 'VisionHandler';
  readonly supportedTypes: StepType[] = ['vision'];

  private readonly vision = VisionService.getInstance();
  private readonly logger = LogService.getInstance();

  public async handle(request: ToolRequest): Promise<ToolResult> {
    const start = Date.now();
    const imagePath = request.parameters['path'] ?? request.parameters['imagePath'] ?? '';
    this.logger.info(
      'VisionHandler',
      `▶ [vision] "${request.label}"${imagePath ? ` | image: "${imagePath}"` : ''}`
    );

    try {
      if (imagePath) {
        const raw = await this.vision.analyzeImage(imagePath);
        const output = typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
        return createToolResult(
          request.stepId, request.planId,
          this.name, 'success', Date.now() - start,
          output
        );
      }

      return createToolResult(
        request.stepId, request.planId,
        this.name, 'success', Date.now() - start,
        `Vision step "${request.label}" routed to VisionService.`
      );

    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error('VisionHandler', `Failed: ${msg}`);
      return createToolResult(
        request.stepId, request.planId,
        this.name, 'failure', Date.now() - start,
        undefined, msg
      );
    }
  }
}
