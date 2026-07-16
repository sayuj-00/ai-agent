/**
 * File Manager Infrastructure — NodeFileRepository
 *
 * Implements IFileRepository using Node.js fs/promises.
 * This is the ONLY file in the module that touches the real filesystem.
 *
 * All 8 operations are implemented here:
 *  read, write, list, search, createFolder, rename, delete, copy, move
 *
 * Every operation:
 *  1. Validates the path through PathGuard first.
 *  2. Performs the real fs operation.
 *  3. Returns a typed FileOperationResult — never throws.
 *
 * Design for extensibility:
 *  - Swap this for a RemoteFileRepository (SFTP, S3) without changing any other layer.
 *  - Swap for a MockFileRepository in tests.
 */

import fs from 'fs/promises';
import path from 'path';
import { constants as fsConstants, type Dirent } from 'fs';

import type { IFileRepository } from '../domain/IFileRepository.js';
import type {
  FileEntry,
  DirectoryListing,
  FileOperationResult,
  SearchMatch,
  SearchResult,
} from '../domain/FileEntry.js';
import { failResult, successResult } from '../domain/FileEntry.js';
import { PathGuard } from './PathGuard.js';
import { resolveMimeType } from './MimeTypeResolver.js';

// ── Max sizes ────────────────────────────────────────────────────────────────
const MAX_READ_BYTES         = 10 * 1024 * 1024;  // 10 MB read limit
const MAX_SEARCH_DEPTH       = 8;                  // Max directory recursion depth
const DEFAULT_MAX_RESULTS    = 200;                // Max search results
const CONTENT_SNIPPET_LENGTH = 120;                // Characters around a match

export class NodeFileRepository implements IFileRepository {

  // ── Read operations ────────────────────────────────────────────────────────

  public async read(filePath: string): Promise<FileOperationResult> {
    const start = Date.now();
    const guard = PathGuard.validateRead(filePath);
    if (!guard.allowed) return failResult(guard.reason!);

    try {
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) {
        return failResult(`"${filePath}" is a directory, not a file. Use list() to read directories.`);
      }
      if (stat.size > MAX_READ_BYTES) {
        return failResult(`File too large to read (${(stat.size / 1024 / 1024).toFixed(1)} MB — limit is 10 MB).`);
      }

      const content = await fs.readFile(filePath, 'utf-8');
      return successResult(
        `Read ${content.length} characters from "${path.basename(filePath)}"`,
        Date.now() - start,
        { content, targetPath: filePath }
      );
    } catch (error: unknown) {
      return failResult(this.errMsg(error), Date.now() - start);
    }
  }

  public async list(dirPath: string, recursive = false): Promise<FileOperationResult> {
    const start = Date.now();
    const guard = PathGuard.validateRead(dirPath);
    if (!guard.allowed) return failResult(guard.reason!);

    try {
      const listing = await this.buildListing(dirPath, recursive, 0);
      return successResult(
        `Listed ${listing.fileCount} files, ${listing.dirCount} folders in "${dirPath}"`,
        Date.now() - start,
        { listing }
      );
    } catch (error: unknown) {
      return failResult(this.errMsg(error), Date.now() - start);
    }
  }

  public async stat(targetPath: string): Promise<FileEntry | null> {
    try {
      const s = await fs.stat(targetPath);
      return this.buildEntry(targetPath, s);
    } catch {
      return null;
    }
  }

  public async search(
    rootPath: string,
    query: string,
    options: {
      searchInContent?: boolean;
      extensionFilter?: string;
      recursive?: boolean;
      maxResults?: number;
    } = {}
  ): Promise<SearchResult> {
    const start = Date.now();
    const {
      searchInContent = false,
      extensionFilter = '',
      recursive = true,
      maxResults = DEFAULT_MAX_RESULTS,
    } = options;

    const matches: SearchMatch[] = [];
    let filesScanned = 0;

    const walk = async (dir: string, depth: number): Promise<void> => {
      if (depth > MAX_SEARCH_DEPTH) return;
      if (matches.length >= maxResults) return;

      let entries: Dirent[];
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const dirent of entries) {
        if (matches.length >= maxResults) break;

        const fullPath = path.join(dir, dirent.name);
        const ext = path.extname(dirent.name).toLowerCase();

        // Extension filter
        if (extensionFilter && !dirent.isDirectory() && ext !== extensionFilter) continue;

        // Name match
        if (dirent.name.toLowerCase().includes(query.toLowerCase())) {
          let size = 0;
          let mtime = new Date();
          let ctime = new Date();
          try {
            const s = await fs.stat(fullPath);
            size  = s.size;
            mtime = s.mtime;
            ctime = s.birthtime;
          } catch { /* ignore */ }

          const score = this.nameScore(dirent.name, query);
          matches.push({
            entry: {
              name: dirent.name, path: fullPath,
              type: dirent.isDirectory() ? 'directory' : 'file',
              size, extension: ext,
              modifiedAt: mtime.toISOString(), createdAt: ctime.toISOString(),
              mimeType: resolveMimeType(ext), readable: true, writable: true,
            },
            matchType: 'name',
            score,
          });
        }

        filesScanned++;

        // Content search (text files only, < 2MB)
        if (searchInContent && !dirent.isDirectory()) {
          try {
            const s = await fs.stat(fullPath);
            if (s.size < 2 * 1024 * 1024 && this.isTextExtension(ext)) {
              const content = await fs.readFile(fullPath, 'utf-8');
              const lines   = content.split('\n');
              for (let i = 0; i < lines.length && matches.length < maxResults; i++) {
                const line = lines[i];
                const idx  = line.toLowerCase().indexOf(query.toLowerCase());
                if (idx !== -1) {
                  const fragment = line.substring(
                    Math.max(0, idx - 30),
                    Math.min(line.length, idx + query.length + 30)
                  ).trim();
                  matches.push({
                    entry: {
                      name: dirent.name, path: fullPath, type: 'file',
                      size: s.size, extension: ext,
                      modifiedAt: s.mtime.toISOString(), createdAt: s.birthtime.toISOString(),
                      mimeType: resolveMimeType(ext), readable: true, writable: true,
                    },
                    matchType: 'content',
                    matchFragment: `…${fragment}…`,
                    lineNumber: i + 1,
                    score: 0.7,
                  });
                }
              }
            }
          } catch { /* ignore unreadable files */ }
        }

        // Recurse
        if (dirent.isDirectory() && recursive) {
          await walk(fullPath, depth + 1);
        }
      }
    };

    const guard = PathGuard.validateRead(rootPath);
    if (guard.allowed) {
      await walk(rootPath, 0);
    }

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);

    return {
      query,
      rootPath,
      matches,
      filesScanned,
      durationMs: Date.now() - start,
    };
  }

  // ── Write operations ───────────────────────────────────────────────────────

  public async write(filePath: string, content: string, overwrite = true): Promise<FileOperationResult> {
    const start = Date.now();
    const guard = PathGuard.validateWrite(filePath);
    if (!guard.allowed) return failResult(guard.reason!);

    try {
      // Check existence
      let exists = false;
      try { await fs.access(filePath); exists = true; } catch { /* not found */ }

      if (exists && !overwrite) {
        return failResult(`File "${filePath}" already exists. Set overwrite=true to replace it.`);
      }

      // Ensure parent directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');

      return successResult(
        `${exists ? 'Overwrote' : 'Created'} "${path.basename(filePath)}" (${content.length} chars)`,
        Date.now() - start,
        { targetPath: filePath }
      );
    } catch (error: unknown) {
      return failResult(this.errMsg(error), Date.now() - start);
    }
  }

  public async createFolder(dirPath: string): Promise<FileOperationResult> {
    const start = Date.now();
    const guard = PathGuard.validateWrite(dirPath);
    if (!guard.allowed) return failResult(guard.reason!);

    try {
      await fs.mkdir(dirPath, { recursive: true });
      return successResult(
        `Folder created: "${dirPath}"`,
        Date.now() - start,
        { targetPath: dirPath }
      );
    } catch (error: unknown) {
      return failResult(this.errMsg(error), Date.now() - start);
    }
  }

  public async rename(sourcePath: string, newName: string): Promise<FileOperationResult> {
    const start = Date.now();

    // Validate source
    const srcGuard = PathGuard.validateWrite(sourcePath);
    if (!srcGuard.allowed) return failResult(srcGuard.reason!);

    // Validate new name
    const nameGuard = PathGuard.validateFilename(newName);
    if (!nameGuard.allowed) return failResult(nameGuard.reason!);

    try {
      const dir  = path.dirname(sourcePath);
      const dest = path.join(dir, newName);

      // Block if destination already exists
      try {
        await fs.access(dest);
        return failResult(`Cannot rename: "${newName}" already exists in the same directory.`);
      } catch { /* good — dest doesn't exist */ }

      await fs.rename(sourcePath, dest);
      return successResult(
        `Renamed "${path.basename(sourcePath)}" → "${newName}"`,
        Date.now() - start,
        { targetPath: dest }
      );
    } catch (error: unknown) {
      return failResult(this.errMsg(error), Date.now() - start);
    }
  }

  public async delete(targetPath: string): Promise<FileOperationResult> {
    const start = Date.now();
    const guard = PathGuard.validateWrite(targetPath);
    if (!guard.allowed) return failResult(guard.reason!);

    try {
      const stat = await fs.stat(targetPath);
      if (stat.isDirectory()) {
        await fs.rm(targetPath, { recursive: true, force: true });
      } else {
        await fs.unlink(targetPath);
      }
      return successResult(
        `Deleted "${path.basename(targetPath)}"`,
        Date.now() - start
      );
    } catch (error: unknown) {
      return failResult(this.errMsg(error), Date.now() - start);
    }
  }

  public async copy(
    sourcePath: string,
    destinationPath: string,
    overwrite = false
  ): Promise<FileOperationResult> {
    const start = Date.now();

    const srcGuard  = PathGuard.validateRead(sourcePath);
    if (!srcGuard.allowed) return failResult(srcGuard.reason!);

    const destGuard = PathGuard.validateWrite(destinationPath);
    if (!destGuard.allowed) return failResult(destGuard.reason!);

    try {
      const stat = await fs.stat(sourcePath);

      if (stat.isDirectory()) {
        await this.copyDir(sourcePath, destinationPath, overwrite);
      } else {
        await fs.mkdir(path.dirname(destinationPath), { recursive: true });
        await fs.copyFile(
          sourcePath,
          destinationPath,
          overwrite ? 0 : fsConstants.COPYFILE_EXCL
        );
      }

      return successResult(
        `Copied "${path.basename(sourcePath)}" → "${destinationPath}"`,
        Date.now() - start,
        { targetPath: destinationPath }
      );
    } catch (error: unknown) {
      return failResult(this.errMsg(error), Date.now() - start);
    }
  }

  public async move(
    sourcePath: string,
    destinationPath: string,
    overwrite = false
  ): Promise<FileOperationResult> {
    const start = Date.now();

    const srcGuard  = PathGuard.validateWrite(sourcePath);
    if (!srcGuard.allowed) return failResult(srcGuard.reason!);

    const destGuard = PathGuard.validateWrite(destinationPath);
    if (!destGuard.allowed) return failResult(destGuard.reason!);

    try {
      // Check destination conflict
      if (!overwrite) {
        try {
          await fs.access(destinationPath);
          return failResult(`Move blocked: "${destinationPath}" already exists. Set overwrite=true to replace.`);
        } catch { /* good */ }
      }

      await fs.mkdir(path.dirname(destinationPath), { recursive: true });
      await fs.rename(sourcePath, destinationPath);

      return successResult(
        `Moved "${path.basename(sourcePath)}" → "${destinationPath}"`,
        Date.now() - start,
        { targetPath: destinationPath }
      );
    } catch (error: unknown) {
      // Cross-device move: copy then delete
      if ((error as NodeJS.ErrnoException).code === 'EXDEV') {
        const copyResult = await this.copy(sourcePath, destinationPath, overwrite);
        if (!copyResult.success) return copyResult;
        await this.delete(sourcePath);
        return successResult(
          `Moved (cross-device) "${path.basename(sourcePath)}" → "${destinationPath}"`,
          Date.now() - start,
          { targetPath: destinationPath }
        );
      }
      return failResult(this.errMsg(error), Date.now() - start);
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async buildListing(
    dirPath: string,
    recursive: boolean,
    depth: number
  ): Promise<DirectoryListing> {
    if (depth > MAX_SEARCH_DEPTH) {
      return { dirPath, entries: [], fileCount: 0, dirCount: 0, totalBytes: 0 };
    }

    const dirents = await fs.readdir(dirPath, { withFileTypes: true });
    const entries: FileEntry[] = [];
    let fileCount = 0;
    let dirCount  = 0;
    let totalBytes = 0;

    for (const dirent of dirents) {
      const fullPath = path.join(dirPath, dirent.name);
      try {
        const stat = await fs.stat(fullPath);
        const entry = this.buildEntry(fullPath, stat);
        entries.push(entry);

        if (dirent.isDirectory()) {
          dirCount++;
          if (recursive) {
            const sub = await this.buildListing(fullPath, true, depth + 1);
            entries.push(...sub.entries);
            fileCount  += sub.fileCount;
            dirCount   += sub.dirCount;
            totalBytes += sub.totalBytes;
          }
        } else {
          fileCount++;
          totalBytes += stat.size;
        }
      } catch { /* skip unreadable entries */ }
    }

    return { dirPath, entries, fileCount, dirCount, totalBytes };
  }

  private buildEntry(fullPath: string, stat: Awaited<ReturnType<typeof fs.stat>>): FileEntry {
    const ext  = path.extname(fullPath).toLowerCase();
    const type = stat.isDirectory() ? 'directory'
               : stat.isSymbolicLink() ? 'symlink'
               : stat.isFile() ? 'file'
               : 'unknown';

    return {
      name:       path.basename(fullPath),
      path:       fullPath,
      type,
      size:       Number(stat.size),
      extension:  ext,
      modifiedAt: stat.mtime.toISOString(),
      createdAt:  stat.birthtime.toISOString(),
      mimeType:   resolveMimeType(ext),
      readable:   true,
      writable:   true,
    };
  }

  /** Recursively copy a directory */
  private async copyDir(src: string, dest: string, overwrite: boolean): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath  = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        await this.copyDir(srcPath, destPath, overwrite);
      } else {
        await fs.copyFile(srcPath, destPath, overwrite ? 0 : fsConstants.COPYFILE_EXCL);
      }
    }
  }

  /** Score a filename match — exact = 1.0, starts-with = 0.9, contains = 0.7 */
  private nameScore(name: string, query: string): number {
    const n = name.toLowerCase();
    const q = query.toLowerCase();
    if (n === q)                       return 1.0;
    if (n.startsWith(q))              return 0.9;
    if (path.parse(n).name === q)     return 0.85;
    return 0.7;
  }

  /** Returns true for file extensions that are safe to read as UTF-8 text */
  private isTextExtension(ext: string): boolean {
    const TEXT_EXTS = new Set([
      '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
      '.json', '.html', '.css', '.scss', '.md', '.txt',
      '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp',
      '.h', '.cs', '.swift', '.kt', '.php', '.sql', '.sh',
      '.yaml', '.yml', '.toml', '.xml', '.csv', '.env',
      '.gitignore', '.editorconfig', '.prettierrc',
    ]);
    return TEXT_EXTS.has(ext) || ext === '';
  }

  private errMsg(error: unknown): string {
    if (error instanceof Error) {
      const e = error as NodeJS.ErrnoException;
      if (e.code === 'ENOENT')  return `File or directory not found: ${e.path ?? ''}`;
      if (e.code === 'EACCES')  return `Permission denied: ${e.path ?? ''}`;
      if (e.code === 'EEXIST')  return `Already exists: ${e.path ?? ''}`;
      if (e.code === 'ENOTDIR') return `Expected a directory but found a file: ${e.path ?? ''}`;
      if (e.code === 'EISDIR')  return `Expected a file but found a directory: ${e.path ?? ''}`;
      return e.message;
    }
    return String(error);
  }
}
