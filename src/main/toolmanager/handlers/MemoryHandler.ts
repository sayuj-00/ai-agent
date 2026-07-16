/**
 * Tool Manager Handler — MemoryHandler
 *
 * Routes 'memory' PlanSteps to MemoryService.
 *
 * Routing (based on parameters):
 *   content present → MemoryService.store(content, category, tags)
 *   query present   → MemoryService.recall(query)
 *   default         → acknowledge step
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
import { MemoryService } from '../../services/MemoryService.js';
import { LogService } from '../../services/LogService.js';

export class MemoryHandler implements IToolHandler {
  readonly name = 'MemoryHandler';
  readonly supportedTypes: StepType[] = ['memory'];

  private readonly memory = MemoryService.getInstance();
  private readonly logger = LogService.getInstance();

  public async handle(request: ToolRequest): Promise<ToolResult> {
    const start = Date.now();
    const { content = '', query = '', category = 'general', tags = '' } = request.parameters;
    this.logger.info('MemoryHandler', `▶ [memory] "${request.label}"`);

    try {
      // Store operation
      if (content) {
        const parsedTags = tags ? tags.split(',').map(t => t.trim()) : [];
        // Map generic category to MemoryService's accepted categories
        const memCategory: 'short-term' | 'episodic' | 'semantic' =
          category === 'episodic' ? 'episodic'
          : category === 'semantic' ? 'semantic'
          : 'short-term';
        await this.memory.store(content, memCategory, parsedTags);
        return createToolResult(
          request.stepId, request.planId,
          this.name, 'success', Date.now() - start,
          `Stored to memory [${category}]: "${content.substring(0, 80)}${content.length > 80 ? '…' : ''}"`
        );
      }

      // Recall operation
      if (query) {
        const results = await this.memory.recall(query);
        return createToolResult(
          request.stepId, request.planId,
          this.name, 'success', Date.now() - start,
          JSON.stringify(results, null, 2)
        );
      }

      // Generic memory step (encode, categorize, etc.) — acknowledge
      return createToolResult(
        request.stepId, request.planId,
        this.name, 'success', Date.now() - start,
        `Memory step "${request.label}" routed to MemoryService.`
      );

    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error('MemoryHandler', `Failed: ${msg}`);
      return createToolResult(
        request.stepId, request.planId,
        this.name, 'failure', Date.now() - start,
        undefined, msg
      );
    }
  }
}
