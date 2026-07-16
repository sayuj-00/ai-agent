/**
 * Tool Manager Domain — IToolHandler
 *
 * The interface every tool handler must implement.
 * This is the ONLY contract the DispatchUseCase knows about.
 *
 * Rules:
 *  - DispatchUseCase only depends on IToolHandler — never on concrete handlers.
 *  - Adding a new tool = implement this interface + register in HandlerRegistry.
 *  - No other changes needed anywhere.
 */

import type { StepType } from '../../planner/domain/Plan.js';
import type { ToolRequest } from './ToolRequest.js';
import type { ToolResult } from './ToolResult.js';

export interface IToolHandler {
  /**
   * Unique display name for this handler.
   * Used in logs and ToolResult.handlerName.
   * e.g. 'BrowserHandler', 'TerminalHandler'
   */
  readonly name: string;

  /**
   * Which StepType values this handler can process.
   * The HandlerRegistry maps each type → this handler.
   * e.g. ['browser', 'search'] means both route here.
   */
  readonly supportedTypes: StepType[];

  /**
   * Route this request to the appropriate service and return the result.
   *
   * Rules for implementors:
   *  - MUST NOT contain business logic — only translation + delegation.
   *  - MUST catch all errors internally and return a failure ToolResult.
   *  - MUST NOT throw — always return a ToolResult.
   *  - SHOULD log at INFO level on entry and exit.
   */
  handle(request: ToolRequest): Promise<ToolResult>;
}
