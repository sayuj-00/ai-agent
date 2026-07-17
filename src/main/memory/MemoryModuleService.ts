/**
 * Memory Module — MemoryModuleService (Public Facade)
 *
 * Single public entry point for the entire Memory module.
 * Wires the dependency graph and exposes a clean, minimal API.
 *
 * Dependency graph (assembled here):
 *
 *   MemoryModuleService
 *     └── MemoryUseCase               (application layer)
 *           └── InMemoryStore         (infrastructure)
 *                 └── MemoryScorer    (recall scoring — pure computation)
 *
 * Future:
 *  - Swap InMemoryStore → SQLiteMemoryStore for persistence
 *  - Swap InMemoryStore → VectorMemoryStore for semantic search
 *  - Zero changes to MemoryUseCase or MemoryModuleService
 *
 * Backward compatibility:
 *  - Exposes store() / recall() / getAllMemories() / clearMemory()
 *    so services/MemoryService.ts shim keeps working unchanged.
 *
 * Re-exports all domain types for single-import convenience.
 */

import { LogService } from '../services/LogService.js';
import { InMemoryStore } from './infrastructure/InMemoryStore.js';
import { MemoryUseCase } from './application/MemoryUseCase.js';

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
} from './domain/MemoryTypes.js';
export type { IMemoryStore } from './domain/IMemoryStore.js';

export class MemoryModuleService {
  private static instance: MemoryModuleService | null = null;
  private readonly useCase: MemoryUseCase;
  private readonly logger = LogService.getInstance();

  private constructor() {
    const store   = new InMemoryStore();
    this.useCase  = new MemoryUseCase(store);

    this.logger.info('Memory', 'Memory module initialized (clean architecture).');
    this.logger.info('Memory', 'Store: InMemoryStore | Categories: short-term · long-term · preference · folder · application · website · task');

    // Seed initial preferences and data
    this.seed();
  }

  public static getInstance(): MemoryModuleService {
    if (!MemoryModuleService.instance) {
      MemoryModuleService.instance = new MemoryModuleService();
    }
    return MemoryModuleService.instance;
  }

  // ── Short-term conversation memory ────────────────────────────────────────

  /** Store a conversation message (auto-expires in 4 hours) */
  public async storeConversationTurn(content: string, role: 'user' | 'assistant' = 'user', tags: string[] = []) {
    return this.useCase.storeConversationTurn(content, role, tags);
  }

  // ── Long-term memory ──────────────────────────────────────────────────────

  /** Store a persistent fact (never expires) */
  public async storeLongTerm(content: string, tags: string[] = [], importance = 0.7) {
    return this.useCase.storeLongTerm(content, tags, importance);
  }

  // ── User preferences ──────────────────────────────────────────────────────

  /** Set a user preference key/value */
  public async setPreference(key: string, value: string) {
    return this.useCase.setPreference(key, value);
  }

  /** Get a preference by key */
  public async getPreference(key: string) {
    return this.useCase.getPreference(key);
  }

  /** Get all preferences as a flat key→value map */
  public async getAllPreferences() {
    return this.useCase.getAllPreferences();
  }

  // ── Folders ───────────────────────────────────────────────────────────────

  /** Record a folder access */
  public async trackFolder(path: string, label?: string) {
    return this.useCase.trackFolder(path, label);
  }

  /** Get the top N most-accessed folders */
  public async getFrequentFolders(limit = 10) {
    return this.useCase.getFrequentFolders(limit);
  }

  // ── Applications ──────────────────────────────────────────────────────────

  /** Record an app launch */
  public async trackApp(name: string, path?: string) {
    return this.useCase.trackApp(name, path);
  }

  /** Get the top N most-launched apps */
  public async getFrequentApps(limit = 10) {
    return this.useCase.getFrequentApps(limit);
  }

  // ── Websites ──────────────────────────────────────────────────────────────

  /** Record a website visit */
  public async trackWebsite(url: string, title?: string) {
    return this.useCase.trackWebsite(url, title);
  }

  /** Get the top N most-visited websites */
  public async getFavoriteWebsites(limit = 10) {
    return this.useCase.getFavoriteWebsites(limit);
  }

  // ── Task history ──────────────────────────────────────────────────────────

  /**
   * Record a completed agent task.
   * @param description  - Human-readable description ("Created Python project")
   * @param intentAction - Intent action that triggered it ("execute_task")
   * @param success      - Whether the task succeeded
   * @param stepCount    - Number of plan steps
   * @param durationMs   - How long it took
   */
  public async recordTask(
    description: string,
    intentAction: string,
    success: boolean,
    stepCount: number,
    durationMs?: number
  ) {
    return this.useCase.recordTask(description, intentAction, success, stepCount, durationMs);
  }

  /** Get the N most recent tasks */
  public async getRecentTasks(limit = 20) {
    return this.useCase.getRecentTasks(limit);
  }

  // ── Recall ────────────────────────────────────────────────────────────────

  /**
   * Search all memory for content matching a query.
   * @param query    - Natural language query
   * @param options  - Filter by category, min score, sort order, limit
   */
  public async recall(query: string, options: import('./domain/MemoryTypes.js').RecallOptions = {}) {
    return this.useCase.recall(query, options);
  }

  // ── Node management ───────────────────────────────────────────────────────

  public async getByCategory(category: import('./domain/MemoryTypes.js').MemoryCategory) {
    return this.useCase.getByCategory(category);
  }

  public async getAll() {
    return this.useCase.getAll();
  }

  public async deleteNode(id: string) {
    return this.useCase.deleteNode(id);
  }

  public async clearCategory(category: import('./domain/MemoryTypes.js').MemoryCategory) {
    return this.useCase.clearCategory(category);
  }

  public async clearAll() {
    return this.useCase.clearAll();
  }

  // ── Stats & maintenance ───────────────────────────────────────────────────

  public async getStats() {
    return this.useCase.getStats();
  }

  public async evictExpired() {
    return this.useCase.evictExpired();
  }

  // ── Backward compat API (matches old MemoryService interface) ─────────────

  /** @deprecated Use storeLongTerm() or storeConversationTurn() instead */
  public async store(content: string, category: 'short-term' | 'episodic' | 'semantic', tags: string[] = []) {
    // Map old categories to new taxonomy
    const mapped = category === 'episodic' ? 'long-term'
                 : category === 'semantic' ? 'long-term'
                 : 'short-term';
    if (mapped === 'short-term') {
      return this.storeConversationTurn(content, 'user', tags);
    }
    return this.storeLongTerm(content, tags);
  }

  /** @deprecated Use recall() instead */
  public async recallMemory(query: string) {
    const results = await this.recall(query);
    return results.map(r => r.node);
  }

  /** @deprecated Use getAll() or getByCategory() instead */
  public async getAllMemories() {
    return this.getAll();
  }

  /** @deprecated Use clearAll() instead */
  public async clearMemory() {
    return this.clearAll();
  }

  // ── Seed data ─────────────────────────────────────────────────────────────

  private async seed(): Promise<void> {
    // Seed default preferences
    await this.useCase.setPreference('theme', 'dark-glassmorphic');
    await this.useCase.setPreference('language', 'en');
    await this.useCase.setPreference('default_browser', 'chrome');
    await this.useCase.setPreference('default_shell', 'powershell');
    await this.useCase.setPreference('confirm_before_delete', 'true');

    // Seed a long-term memory
    await this.useCase.storeLongTerm(
      'User prefers dark/glassmorphic theme and prefers TypeScript over JavaScript.',
      ['user-profile', 'theme', 'language'],
      0.8
    );

    this.logger.info('Memory', 'Seed data loaded (preferences + initial long-term memories).');
  }
}
