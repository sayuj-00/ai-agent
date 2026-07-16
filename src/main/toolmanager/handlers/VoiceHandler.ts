/**
 * Tool Manager Handler — VoiceHandler
 *
 * Routes 'voice' PlanSteps to VoiceService.
 *
 * Routing:
 *   text/content param present → VoiceService.speak(text)
 *   listen keyword in label    → VoiceService.listen()
 *   default                    → acknowledge step
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
import { VoiceService } from '../../services/VoiceService.js';
import { LogService } from '../../services/LogService.js';

export class VoiceHandler implements IToolHandler {
  readonly name = 'VoiceHandler';
  readonly supportedTypes: StepType[] = ['voice'];

  private readonly voice  = VoiceService.getInstance();
  private readonly logger = LogService.getInstance();

  public async handle(request: ToolRequest): Promise<ToolResult> {
    const start = Date.now();
    const text = request.parameters['text'] ?? request.parameters['content'] ?? '';
    this.logger.info('VoiceHandler', `▶ [voice] "${request.label}"`);

    try {
      // Listen operation
      if (/listen|transcribe|record/i.test(request.label)) {
        const transcript = await this.voice.listen();
        return createToolResult(
          request.stepId, request.planId,
          this.name, 'success', Date.now() - start,
          `Transcribed: "${typeof transcript === 'string' ? transcript : JSON.stringify(transcript)}"`
        );
      }

      // Speak operation
      if (text) {
        await this.voice.speak(text);
        return createToolResult(
          request.stepId, request.planId,
          this.name, 'success', Date.now() - start,
          `Spoken: "${text.substring(0, 80)}${text.length > 80 ? '…' : ''}"`
        );
      }

      // Generic voice step — acknowledge
      return createToolResult(
        request.stepId, request.planId,
        this.name, 'success', Date.now() - start,
        `Voice step "${request.label}" routed to VoiceService.`
      );

    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error('VoiceHandler', `Failed: ${msg}`);
      return createToolResult(
        request.stepId, request.planId,
        this.name, 'failure', Date.now() - start,
        undefined, msg
      );
    }
  }
}
