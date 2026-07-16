/**
 * File Manager Module — FileManagerService (Public Facade)
 *
 * Single public entry point for the entire File Manager module.
 * Wires the dependency graph and exposes a clean, minimal API.
 *
 * Dependency graph (wired here):
 *
 *   FileManagerService
 *     └── FileManagerUseCase           (application layer)
 *           └── NodeFileRepository     (infrastructure — real fs/promises)
 *                 ├── PathGuard        (security validation)
 *                 └── MimeTypeResolver (extension → MIME)
 *
 * Callers (IPC handlers, ToolManager's FileSystemHandler)
 * only import FileManagerService. They never see the internals.
 *
 * Re-exports all domain types — callers use a single import point.
 */

import { LogService } from '../services/LogService.js';
import { NodeFileRepository } from './infrastructure/NodeFileRepository.js';
import { FileManagerUseCase } from './application/FileManagerUseCase.js';

// Re-export all public types
export type {
  FileEntry, EntryType,
  DirectoryListing,
  SearchMatch, SearchResult,
  FileOperationResult,
  FileOperation, FileOperationRequest,
} from './domain/FileEntry.js';
export type { IFileRepository } from './domain/IFileRepository.js';

export class FileManagerService {
  private static instance: FileManagerService | null = null;
  private readonly useCase: FileManagerUseCase;
  private readonly logger = LogService.getInstance();

  private constructor() {
    const repo = new NodeFileRepository();
    this.useCase = new FileManagerUseCase(repo);
    this.logger.info('FileManager', 'File Manager initialized (clean architecture).');
    this.logger.info('FileManager', 'Operations: read · write · list · search · createFolder · rename · delete · copy · move');
  }

  public static getInstance(): FileManagerService {
    if (!FileManagerService.instance) {
      FileManagerService.instance = new FileManagerService();
    }
    return FileManagerService.instance;
  }

  // ── Read operations ───────────────────────────────────────────────────────

  /** Read the full text content of a file */
  public async read(filePath: string) {
    return this.useCase.read(filePath);
  }

  /** List entries in a directory */
  public async list(dirPath: string, recursive = false) {
    return this.useCase.list(dirPath, recursive);
  }

  /** Get metadata for a single path (returns null if not found) */
  public async stat(targetPath: string) {
    return this.useCase.stat(targetPath);
  }

  /**
   * Search for files/folders matching a query.
   *
   * @param rootPath       - Directory to search in
   * @param query          - Name fragment or keyword to search for
   * @param searchInContent- If true, also searches inside file contents
   * @param extensionFilter- If provided, only matches files with this extension (e.g. ".ts")
   * @param recursive      - If true (default), searches all subdirectories
   * @param maxResults     - Maximum number of matches to return (default 200)
   */
  public async search(
    rootPath: string,
    query: string,
    searchInContent = false,
    extensionFilter = '',
    recursive = true,
    maxResults = 200
  ) {
    return this.useCase.search(rootPath, query, {
      searchInContent, extensionFilter, recursive, maxResults
    });
  }

  // ── Write operations ──────────────────────────────────────────────────────

  /** Write text content to a file (creates parent dirs automatically) */
  public async write(filePath: string, content: string, overwrite = true) {
    return this.useCase.write(filePath, content, overwrite);
  }

  /** Create a directory (and all missing parent directories) */
  public async createFolder(dirPath: string) {
    return this.useCase.createFolder(dirPath);
  }

  /** Rename a file or directory (new name only, not a full path) */
  public async rename(path: string, newName: string) {
    return this.useCase.rename(path, newName);
  }

  /** Delete a file or directory (recursive for directories) */
  public async delete(targetPath: string) {
    return this.useCase.delete(targetPath);
  }

  /** Copy a file or directory to a new location */
  public async copy(sourcePath: string, destinationPath: string, overwrite = false) {
    return this.useCase.copy(sourcePath, destinationPath, overwrite);
  }

  /** Move a file or directory to a new location */
  public async move(sourcePath: string, destinationPath: string, overwrite = false) {
    return this.useCase.move(sourcePath, destinationPath, overwrite);
  }

  // ── Backward compatibility (services/FileManager.ts legacy API) ───────────

  /** @deprecated Use list() instead */
  public async listFiles(dirPath: string) {
    const result = await this.list(dirPath);
    return result.listing?.entries ?? [];
  }

  /** @deprecated Use read() instead */
  public async readSecure(filePath: string): Promise<string> {
    const result = await this.read(filePath);
    return result.content ?? '';
  }

  /** @deprecated Use write() instead */
  public async writeSecure(filePath: string, content: string): Promise<boolean> {
    const result = await this.write(filePath, content, true);
    return result.success;
  }
}
