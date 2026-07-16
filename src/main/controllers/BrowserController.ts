/**
 * controllers/BrowserController.ts — Backward Compatibility Shim
 *
 * The Browser Controller has been refactored into a clean-architecture module at:
 *   src/main/browser/
 *
 * This file re-exports BrowserControllerService as BrowserController so all
 * existing import paths (ipcHandlers, BrowserHandler in ToolManager, etc.)
 * continue to work without modification.
 *
 * DO NOT add new logic here — use src/main/browser/BrowserControllerService.ts.
 */
export { BrowserControllerService as BrowserController } from '../browser/BrowserControllerService.js';
export type {
  BrowserTab, TabStatus,
  BrowserSession, SessionStatus,
  BrowserResult, NavigationResult,
  WebSearchResult, WebSearchResultItem,
  DownloadJob, DownloadStatus, DownloadResult,
  IBrowserDriver,
} from '../browser/BrowserControllerService.js';
