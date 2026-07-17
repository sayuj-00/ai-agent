/**
 * services/MemoryService.ts — Backward Compatibility Shim
 *
 * The Memory module has been refactored into clean architecture at:
 *   src/main/memory/
 *
 * This file re-exports MemoryModuleService as MemoryService so all existing
 * import paths (ipcHandlers, MemoryHandler in ToolManager, etc.) continue to
 * work without modification.
 *
 * DO NOT add new logic here — use src/main/memory/MemoryModuleService.ts.
 */
export { MemoryModuleService as MemoryService } from '../memory/MemoryModuleService.js';
export type {
  MemoryNode,
  MemoryCategory,
  RecallOptions,
  RecallResult,
  MemoryStats,
  PreferenceEntry,
  FolderEntry,
  AppEntry,
  WebsiteEntry,
  TaskEntry,
  IMemoryStore,
} from '../memory/MemoryModuleService.js';
