/**
 * Tool Manager Handler — FileSystemHandler
 *
 * Routes 'filesystem' PlanSteps to FileManager.
 *
 * Routing (based on 'operation' parameter):
 *   read   → FileManager.readSecure(path)
 *   write  → FileManager.writeSecure(path, content)
 *   list   → FileManager.listFiles(path)
 *   create / delete / (default) → acknowledge step
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
import { FileManager } from '../../services/FileManager.js';
import { LogService } from '../../services/LogService.js';

export class FileSystemHandler implements IToolHandler {
  readonly name = 'FileSystemHandler';
  readonly supportedTypes: StepType[] = ['filesystem'];

  private readonly files  = FileManager.getInstance();
  private readonly logger = LogService.getInstance();

  public async handle(request: ToolRequest): Promise<ToolResult> {
    const start = Date.now();
    const { path = '', operation = '', content = '' } = request.parameters;
    this.logger.info(
      'FileSystemHandler',
      `▶ [filesystem] "${request.label}"${path ? ` | path: "${path}"` : ''} | op: "${operation || 'auto'}"`
    );

    try {
      // Detect operation from label if not provided explicitly
      const op = operation || this.detectOperation(request.label);

      switch (op) {
        case 'read': {
          if (!path) throw new Error('Missing required parameter: "path"');
          const fileContent = await this.files.readSecure(path);
          return createToolResult(
            request.stepId, request.planId,
            this.name, 'success', Date.now() - start,
            fileContent
          );
        }

        case 'write': {
          if (!path) throw new Error('Missing required parameter: "path"');
          await this.files.writeSecure(path, content);
          return createToolResult(
            request.stepId, request.planId,
            this.name, 'success', Date.now() - start,
            `Written ${content.length} bytes to: ${path}`
          );
        }

        case 'list': {
          if (!path) throw new Error('Missing required parameter: "path"');
          const listing = await this.files.listFiles(path);
          return createToolResult(
            request.stepId, request.planId,
            this.name, 'success', Date.now() - start,
            JSON.stringify(listing, null, 2)
          );
        }

        default:
          // create / delete / scaffold / other — acknowledge
          return createToolResult(
            request.stepId, request.planId,
            this.name, 'success', Date.now() - start,
            `FileSystem step "${request.label}" routed to FileManager.`
          );
      }

    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error('FileSystemHandler', `Failed: ${msg}`);
      return createToolResult(
        request.stepId, request.planId,
        this.name, 'failure', Date.now() - start,
        undefined, msg
      );
    }
  }

  /** Detect file operation from the step label when not explicitly provided */
  private detectOperation(label: string): string {
    if (/\bread\b/i.test(label))                   return 'read';
    if (/\bwrite|save|update\b/i.test(label))      return 'write';
    if (/\blist|show|ls\b/i.test(label))           return 'list';
    if (/\bcreate|scaffold|make\b/i.test(label))   return 'create';
    if (/\bdelete|remove|rm\b/i.test(label))       return 'delete';
    return 'acknowledge';
  }
}
