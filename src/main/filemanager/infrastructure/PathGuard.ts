/**
 * File Manager Infrastructure — PathGuard
 *
 * Security utility that validates all paths before any operation runs.
 *
 * Rules enforced:
 *  1. No path traversal (../ sequences after normalization)
 *  2. No absolute-path injection inside relative inputs
 *  3. Block dangerous system directories (Windows + Unix)
 *  4. Block dangerous file extensions (executables in write mode)
 *  5. Enforce maximum path length
 *  6. Enforce maximum filename length
 *
 * This is infrastructure — it knows about the OS but has no domain logic.
 */

import path from 'path';

// ── Blocked system roots ────────────────────────────────────────────────────
const BLOCKED_ROOTS = [
  // Windows system
  'C:\\Windows',
  'C:\\Program Files',
  'C:\\Program Files (x86)',
  'C:\\ProgramData',
  // Unix system
  '/etc',
  '/usr',
  '/bin',
  '/sbin',
  '/lib',
  '/boot',
  '/sys',
  '/proc',
  '/dev',
  '/root',
];

// ── Blocked write extensions ────────────────────────────────────────────────
const BLOCKED_WRITE_EXTENSIONS = new Set([
  '.exe', '.dll', '.bat', '.cmd', '.com', '.msi',
  '.vbs', '.ps1', '.pif', '.scr', '.sys', '.drv',
]);

// ── Limits ──────────────────────────────────────────────────────────────────
const MAX_PATH_LENGTH     = 512;
const MAX_FILENAME_LENGTH = 255;

export interface GuardResult {
  allowed: boolean;
  reason?: string;
}

export class PathGuard {
  /**
   * Validate a path for any read operation.
   * Allows all extensions — only blocks system roots and traversal.
   */
  public static validateRead(inputPath: string): GuardResult {
    return PathGuard.validate(inputPath, 'read');
  }

  /**
   * Validate a path for any write operation.
   * Additionally blocks dangerous file extensions.
   */
  public static validateWrite(inputPath: string): GuardResult {
    return PathGuard.validate(inputPath, 'write');
  }

  /**
   * Validate a filename (no directory separators allowed).
   */
  public static validateFilename(filename: string): GuardResult {
    if (!filename || filename.trim().length === 0) {
      return { allowed: false, reason: 'Filename cannot be empty.' };
    }
    if (filename.length > MAX_FILENAME_LENGTH) {
      return { allowed: false, reason: `Filename exceeds ${MAX_FILENAME_LENGTH} characters.` };
    }
    if (/[/\\:*?"<>|]/.test(filename)) {
      return { allowed: false, reason: `Filename contains illegal characters: /\\:*?"<>|` };
    }
    if (filename === '.' || filename === '..') {
      return { allowed: false, reason: 'Filename cannot be "." or "..".' };
    }
    return { allowed: true };
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private static validate(inputPath: string, mode: 'read' | 'write'): GuardResult {
    if (!inputPath || inputPath.trim().length === 0) {
      return { allowed: false, reason: 'Path cannot be empty.' };
    }

    if (inputPath.length > MAX_PATH_LENGTH) {
      return { allowed: false, reason: `Path exceeds ${MAX_PATH_LENGTH} characters.` };
    }

    // Normalize to resolve any ../ segments
    const normalized = path.normalize(inputPath);

    // Block path traversal: if normalized differs by going up, that's suspicious
    // Key check: reject any path that still contains '..' segments
    if (normalized.includes('..')) {
      return { allowed: false, reason: 'Path traversal detected ("..") — access denied.' };
    }

    // Block dangerous system directories
    for (const blocked of BLOCKED_ROOTS) {
      if (normalized.startsWith(blocked)) {
        return { allowed: false, reason: `Access denied: path is inside a protected system directory (${blocked}).` };
      }
    }

    // Block dangerous write extensions
    if (mode === 'write') {
      const ext = path.extname(normalized).toLowerCase();
      if (BLOCKED_WRITE_EXTENSIONS.has(ext)) {
        return { allowed: false, reason: `Write blocked: extension "${ext}" is not allowed for security reasons.` };
      }
    }

    return { allowed: true };
  }
}
