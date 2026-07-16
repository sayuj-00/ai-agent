/**
 * File Manager Domain — IFileRepository (Input Port)
 *
 * The interface the application layer uses to perform all file operations.
 * The application layer ONLY depends on this interface — never on fs/promises
 * or any concrete implementation.
 *
 * Rules:
 *  - All methods are async and return FileOperationResult.
 *  - Implementations live in infrastructure/ (NodeFileRepository).
 *  - Future: mock implementation for tests, sandboxed implementation for security.
 */

import type {
  FileEntry,
  DirectoryListing,
  FileOperationResult,
  SearchResult,
} from './FileEntry.js';

export interface IFileRepository {
  // ── Read operations ──────────────────────────────────────────────────────

  /** Read the text content of a file */
  read(filePath: string): Promise<FileOperationResult>;

  /** List entries in a directory (non-recursive by default) */
  list(dirPath: string, recursive?: boolean): Promise<FileOperationResult>;

  /** Get metadata for a single file or directory */
  stat(path: string): Promise<FileEntry | null>;

  /** Search for files/folders by name, extension, or content */
  search(
    rootPath: string,
    query: string,
    options?: {
      searchInContent?: boolean;
      extensionFilter?: string;
      recursive?: boolean;
      maxResults?: number;
    }
  ): Promise<SearchResult>;

  // ── Write operations ─────────────────────────────────────────────────────

  /** Write (or overwrite) text content to a file */
  write(filePath: string, content: string, overwrite?: boolean): Promise<FileOperationResult>;

  /** Create a directory (and all missing parent directories) */
  createFolder(dirPath: string): Promise<FileOperationResult>;

  /** Rename a file or directory */
  rename(path: string, newName: string): Promise<FileOperationResult>;

  /** Delete a file or directory (recursive for directories) */
  delete(path: string): Promise<FileOperationResult>;

  /** Copy a file or directory to a destination */
  copy(sourcePath: string, destinationPath: string, overwrite?: boolean): Promise<FileOperationResult>;

  /** Move (rename across paths) a file or directory */
  move(sourcePath: string, destinationPath: string, overwrite?: boolean): Promise<FileOperationResult>;
}
