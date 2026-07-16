/**
 * Tool Manager Handler — TerminalHandler
 *
 * Routes 'terminal' and 'verification' PlanSteps to TerminalController.
 *
 * Routing:
 *   command param present → executeCommand(command)
 *   no command param      → acknowledge step (e.g. "Open terminal in project")
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
import { TerminalController } from '../../controllers/TerminalController.js';
import { LogService } from '../../services/LogService.js';

export class TerminalHandler implements IToolHandler {
  readonly name = 'TerminalHandler';
  readonly supportedTypes: StepType[] = ['terminal', 'verification'];

  private readonly terminal = TerminalController.getInstance();
  private readonly logger   = LogService.getInstance();

  public async handle(request: ToolRequest): Promise<ToolResult> {
    const start = Date.now();
    const command = request.parameters['command'] ?? '';
    this.logger.info(
      'TerminalHandler',
      `▶ [${request.stepType}] "${request.label}"${command ? ` | cmd: "${command}"` : ''}`
    );

    try {
      if (command) {
        const raw = await this.terminal.executeCommand(command);
        const output = typeof raw === 'string' ? raw : JSON.stringify(raw);
        return createToolResult(
          request.stepId, request.planId,
          this.name, 'success', Date.now() - start,
          output || `Command executed: ${command}`
        );
      }

      // No explicit command — acknowledge the step (e.g. "Open terminal in project")
      return createToolResult(
        request.stepId, request.planId,
        this.name, 'success', Date.now() - start,
        `Terminal step "${request.label}" routed to TerminalController.`
      );

    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error('TerminalHandler', `Failed: ${msg}`);
      return createToolResult(
        request.stepId, request.planId,
        this.name, 'failure', Date.now() - start,
        undefined, msg
      );
    }
  }
}
