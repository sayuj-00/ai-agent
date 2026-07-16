/**
 * File Manager Domain — FileEntry
 *
 * Core data models for the File Manager module.
 * Pure types — ZERO imports.
 *
 * Rules:
 *  - No imports from services, Node.js APIs, or Electron.
 *  - All types here are stable contracts used across all File Manager layers.
 */

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

/** Type of a filesystem entry */
export type EntryType = 'file' | 'directory' | 'symlink' | 'unknown';

/** Metadata for a single file or directory */
export interface FileEntry {
  /** Filename only — e.g. "package.json" */
  name: string;

  /** Absolute path — e.g. "C:/project/package.json" */
  path: string;

  /** What kind of entry this is */
  type: EntryType;

  /** File size in bytes (0 for directories) */
  size: number;

  /** File extension including dot — e.g. ".ts", ".json", "" for folders */
  extension: string;

  /** ISO 8601 last-modified timestamp */
  modifiedAt: string;

  /** ISO 8601 creation timestamp */
  createdAt: string;

  /** MIME type (best-effort, inferred from extension) */
  mimeType: string;

  /** Whether the process has read permission */
  readable: boolean;

  /** Whether the process has write permission */
  writable: boolean;
}

/** Result of a directory listing */
export interface DirectoryListing {
  /** Absolute path of the directory listed */
  dirPath: string;

  /** All entries found */
  entries: FileEntry[];

  /** Total number of files */
  fileCount: number;

  /** Total number of subdirectories */
  dirCount: number;

  /** Combined size of all files in bytes */
  totalBytes: number;
}

/** A single search result match */
export interface SearchMatch {
  /** The file entry that matched */
  entry: FileEntry;

  /** Why it matched — 'name' | 'content' | 'extension' | 'pattern' */
  matchType: 'name' | 'content' | 'extension' | 'pattern';

  /** The specific text fragment that matched (for content searches) */
  matchFragment?: string;

  /** Line number of content match (1-indexed, content searches only) */
  lineNumber?: number;

  /** Relevance score 0–1 */
  score: number;
}

/** Complete search results */
export interface SearchResult {
  /** The query that produced these results */
  query: string;

  /** Root directory the search was performed in */
  rootPath: string;

  /** All matches found */
  matches: SearchMatch[];

  /** Total files scanned */
  filesScanned: number;

  /** Wall-clock search duration in milliseconds */
  durationMs: number;
}

/** Result of any mutating file operation */
export interface FileOperationResult {
  /** Whether the operation succeeded */
  success: boolean;

  /** Human-readable description of what was done */
  message: string;

  /** The absolute path of the output (created/renamed/copied/moved target) */
  targetPath?: string;

  /** For read operations — the file content */
  content?: string;

  /** For list operations — the directory listing */
  listing?: DirectoryListing;

  /** For search operations — search results */
  searchResult?: SearchResult;

  /** Error message if success=false */
  error?: string;

  /** How long the operation took in milliseconds */
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Operation descriptors (for future Planner integration)
// ---------------------------------------------------------------------------

/** All supported file operations */
export type FileOperation =
  | 'read'
  | 'write'
  | 'list'
  | 'search'
  | 'create_folder'
  | 'rename'
  | 'delete'
  | 'copy'
  | 'move';

/** Input parameters for any file operation */
export interface FileOperationRequest {
  /** The operation to perform */
  operation: FileOperation;

  /** Primary path (source for copy/move, target for read/write/create) */
  path: string;

  /** Destination path (copy/move operations) */
  destinationPath?: string;

  /** New name (rename operations) */
  newName?: string;

  /** Content to write (write operations) */
  content?: string;

  /** Search query (search operations) */
  query?: string;

  /** Whether to search file contents (not just names) */
  searchInContent?: boolean;

  /** File extension filter for search e.g. ".ts" */
  extensionFilter?: string;

  /** Whether to recurse into subdirectories */
  recursive?: boolean;

  /** Whether to overwrite if target already exists */
  overwrite?: boolean;
}

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

/** Build a failed FileOperationResult */
export function failResult(error: string, durationMs = 0): FileOperationResult {
  return { success: false, message: error, error, durationMs };
}

/** Build a successful FileOperationResult */
export function successResult(
  message: string,
  durationMs: number,
  extras: Partial<FileOperationResult> = {}
): FileOperationResult {
  return { success: true, message, durationMs, ...extras };
}
