/**
 * services/ToolManager.ts — Backward Compatibility Shim
 *
 * The Tool Manager has been refactored into a clean-architecture module at:
 *   src/main/toolmanager/
 *
 * This file re-exports ToolManagerService as ToolManager so all existing
 * import paths (ipcHandlers, AppController, etc.) continue to work unchanged.
 *
 * DO NOT add new logic here — use src/main/toolmanager/ToolManagerService.ts.
 */
export { ToolManagerService as ToolManager } from '../toolmanager/ToolManagerService.js';
export type {
  ToolRequest, ToolResult, ToolResultStatus, IToolHandler
} from '../toolmanager/ToolManagerService.js';
