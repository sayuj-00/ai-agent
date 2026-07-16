/**
 * File Manager Application Layer — FileManagerUseCase
 *
 * Orchestrates all file operations through IFileRepository.
 *
 * Rules (Clean Architecture):
 *  - Only imports from domain/ (types + interfaces).
 *  - Has ZERO knowledge of NodeFileRepository, fs/promises, or Electron.
 *  - Adds logging around every operation for the Logs panel.
 *  - Every method returns a FileOperationResult — never throws.
 *  - Fully testable with a MockFileRepository.
 */

import type { IFileRepository } from '../domain/IFileRepository.js';
import type { FileEntry, FileOperationResult, SearchResult } from '../domain/FileEntry.js';
import { LogService } from '../../services/LogService.js';

export class FileManagerUseCase {
  private readonly logger = LogService.getInstance();

  constructor(private readonly repo: IFileRepository) {}

  // ── Read operations ─────────────────────────────────────────────────────

  public async read(filePath: string): Promise<FileOperationResult> {
    this.logger.info('FileManager', `📖 Read: "${filePath}"`);
    const result = await this.repo.read(filePath);
    this.logResult('Read', result);
    return result;
  }

  public async list(dirPath: string, recursive = false): Promise<FileOperationResult> {
    this.logger.info('FileManager', `📂 List: "${dirPath}"${recursive ? ' (recursive)' : ''}`);
    const result = await this.repo.list(dirPath, recursive);
    this.logResult('List', result);
    return result;
  }

  public async stat(targetPath: string): Promise<FileEntry | null> {
    this.logger.info('FileManager', `ℹ️  Stat: "${targetPath}"`);
    return this.repo.stat(targetPath);
  }

  public async search(
    rootPath: string,
    query: string,
    options?: {
      searchInContent?: boolean;
      extensionFilter?: string;
      recursive?: boolean;
      maxResults?: number;
    }
  ): Promise<SearchResult> {
    this.logger.info(
      'FileManager',
      `🔍 Search: "${query}" in "${rootPath}"` +
      (options?.extensionFilter ? ` [ext: ${options.extensionFilter}]` : '') +
      (options?.searchInContent ? ' [content search]' : '')
    );
    const result = await this.repo.search(rootPath, query, options);
    this.logger.info(
      'FileManager',
      `🔍 Search complete: ${result.matches.length} matches in ${result.filesScanned} files | ${result.durationMs}ms`
    );
    return result;
  }

  // ── Write operations ────────────────────────────────────────────────────

  public async write(
    filePath: string,
    content: string,
    overwrite = true
  ): Promise<FileOperationResult> {
    this.logger.info('FileManager', `✏️  Write: "${filePath}" (${content.length} chars)`);
    const result = await this.repo.write(filePath, content, overwrite);
    this.logResult('Write', result);
    return result;
  }

  public async createFolder(dirPath: string): Promise<FileOperationResult> {
    this.logger.info('FileManager', `📁 Create folder: "${dirPath}"`);
    const result = await this.repo.createFolder(dirPath);
    this.logResult('Create folder', result);
    return result;
  }

  public async rename(sourcePath: string, newName: string): Promise<FileOperationResult> {
    this.logger.info('FileManager', `✏️  Rename: "${sourcePath}" → "${newName}"`);
    const result = await this.repo.rename(sourcePath, newName);
    this.logResult('Rename', result);
    return result;
  }

  public async delete(targetPath: string): Promise<FileOperationResult> {
    this.logger.info('FileManager', `🗑️  Delete: "${targetPath}"`);
    const result = await this.repo.delete(targetPath);
    this.logResult('Delete', result);
    return result;
  }

  public async copy(
    sourcePath: string,
    destinationPath: string,
    overwrite = false
  ): Promise<FileOperationResult> {
    this.logger.info('FileManager', `📋 Copy: "${sourcePath}" → "${destinationPath}"`);
    const result = await this.repo.copy(sourcePath, destinationPath, overwrite);
    this.logResult('Copy', result);
    return result;
  }

  public async move(
    sourcePath: string,
    destinationPath: string,
    overwrite = false
  ): Promise<FileOperationResult> {
    this.logger.info('FileManager', `🚚 Move: "${sourcePath}" → "${destinationPath}"`);
    const result = await this.repo.move(sourcePath, destinationPath, overwrite);
    this.logResult('Move', result);
    return result;
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private logResult(op: string, result: FileOperationResult): void {
    if (result.success) {
      this.logger.info('FileManager', `✔ ${op}: ${result.message} | ${result.durationMs}ms`);
    } else {
      this.logger.error('FileManager', `✖ ${op} failed: ${result.error}`);
    }
  }
}
