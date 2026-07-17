/**
 * controllers/TerminalController.ts — Backward Compatibility Shim
 *
 * The Terminal Controller has been refactored into a clean-architecture module at:
 *   src/main/terminal/
 *
 * This file re-exports TerminalControllerService as TerminalController so all
 * existing import paths (ipcHandlers, AppController, etc.) continue to work
 * without modification.
 *
 * DO NOT add new logic here — use src/main/terminal/TerminalControllerService.ts.
 */
export { TerminalControllerService as TerminalController } from '../terminal/TerminalControllerService.js';
export type {
  CommandResult,
  CommandStatus,
  ExecutionOutcome,
  ExecutionOptions,
  OutputLine,
  TerminalSession,
  ITerminalRunner,
  TerminalStats,
} from '../terminal/TerminalControllerService.js';
