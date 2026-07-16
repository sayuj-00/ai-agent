/**
 * services/FileManager.ts — Backward Compatibility Shim
 *
 * The File Manager has been refactored into a clean-architecture module at:
 *   src/main/filemanager/
 *
 * This file re-exports FileManagerService as FileManager so all existing
 * import paths (ipcHandlers, ToolManager's FileSystemHandler, etc.)
 * continue to work without modification.
 *
 * DO NOT add new logic here — use src/main/filemanager/FileManagerService.ts.
 */
export { FileManagerService as FileManager } from '../filemanager/FileManagerService.js';
export type {
  FileEntry, EntryType,
  DirectoryListing,
  SearchMatch, SearchResult,
  FileOperationResult,
  FileOperation, FileOperationRequest,
  IFileRepository,
} from '../filemanager/FileManagerService.js';

// Legacy type alias kept for any code that used FileInfo from the old stub
export type { FileEntry as FileInfo } from '../filemanager/FileManagerService.js';
