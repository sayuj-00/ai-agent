/**
 * Tool Manager Handler — BrowserHandler
 *
 * Routes 'browser' and 'search' PlanSteps to BrowserController.
 *
 * Routing:
 *   browser step + url param  → launch() + navigate(url)
 *   search  step + query param → launch() + navigate(google search URL)
 *   browser step (no url)     → acknowledge step (browser already open)
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
import { BrowserController } from '../../controllers/BrowserController.js';
import { LogService } from '../../services/LogService.js';

export class BrowserHandler implements IToolHandler {
  readonly name = 'BrowserHandler';
  readonly supportedTypes: StepType[] = ['browser', 'search'];

  private readonly browser = BrowserController.getInstance();
  private readonly logger  = LogService.getInstance();

  public async handle(request: ToolRequest): Promise<ToolResult> {
    const start = Date.now();
    this.logger.info('BrowserHandler', `▶ [${request.stepType}] "${request.label}"`);

    try {
      const { url, query } = request.parameters;

      // Derive target URL — search steps get a Google query URL
      const targetUrl = url
        ? url
        : query
          ? `https://www.google.com/search?q=${encodeURIComponent(query)}`
          : undefined;

      if (targetUrl) {
        await this.browser.launch(false);
        await this.browser.navigate(targetUrl);
        return createToolResult(
          request.stepId, request.planId,
          this.name, 'success', Date.now() - start,
          `Browser navigated to: ${targetUrl}`
        );
      }

      // Generic browser step with no URL (e.g. "wait for page ready", "close session")
      if (/close|quit|exit/i.test(request.label)) {
        await this.browser.close();
        return createToolResult(
          request.stepId, request.planId,
          this.name, 'success', Date.now() - start,
          'Browser session closed.'
        );
      }

      if (/screenshot/i.test(request.label)) {
        const shot = await this.browser.capturePageScreenshot();
        return createToolResult(
          request.stepId, request.planId,
          this.name, 'success', Date.now() - start,
          `Screenshot captured: ${JSON.stringify(shot)}`
        );
      }

      // Fallback — acknowledge the step
      return createToolResult(
        request.stepId, request.planId,
        this.name, 'success', Date.now() - start,
        `Browser step "${request.label}" routed to BrowserController.`
      );

    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error('BrowserHandler', `Failed: ${msg}`);
      return createToolResult(
        request.stepId, request.planId,
        this.name, 'failure', Date.now() - start,
        undefined, msg
      );
    }
  }
}
