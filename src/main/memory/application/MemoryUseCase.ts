/**
 * Memory Module Application Layer — MemoryUseCase
 *
 * Orchestrates all memory operations through IMemoryStore.
 *
 * Rules (Clean Architecture):
 *  - Only imports from domain/ (types + interfaces).
 *  - Zero knowledge of InMemoryStore, SQLite, or any storage backend.
 *  - Adds structured logging for every operation.
 *  - Handles short-term expiry, importance decay, and seed data.
 *  - Fully testable by injecting a MockMemoryStore.
 *
 * High-level behaviours:
 *  - storeConversationTurn()     → short-term with 4-hour expiry
 *  - storeLongTerm()             → long-term, never expires
 *  - setPreference() / getPreference()
 *  - trackFolder() / getFrequentFolders()
 *  - trackApp()    / getFrequentApps()
 *  - trackWebsite()/ getFavoriteWebsites()
 *  - recordTask()  / getRecentTasks()
 *  - recall()      → multi-category search with scoring
 */

import type { IMemoryStore } from '../domain/IMemoryStore.js';
import type {
  MemoryNode,
  MemoryCategory,
  RecallOptions,
  RecallResult,
  MemoryStats,
} from '../domain/MemoryTypes.js';
import {
  createMemoryNode,
  expiresInMinutes,
  expiresInDays,
} from '../domain/MemoryTypes.js';
import { LogService } from '../../services/LogService.js';

export class MemoryUseCase {
  private readonly logger = LogService.getInstance();

  constructor(private readonly store: IMemoryStore) {}

  // ── Short-term memory (conversation) ─────────────────────────────────────

  /**
   * Store a single conversation turn (user message or agent response).
   * Auto-expires in 4 hours. Capped at 100 nodes.
   */
  public async storeConversationTurn(
    content: string,
    role: 'user' | 'assistant' = 'user',
    tags: string[] = []
  ): Promise<MemoryNode> {
    this.logger.info('Memory', `💬 Short-term: ${role} — "${content.substring(0, 60)}"`);
    const node = createMemoryNode('short-term', content, {
      tags:      [...tags, role, 'conversation'],
      expiresAt: expiresInMinutes(240), // 4 hours
      source:    role === 'user' ? 'user' : 'agent',
      importance: 0.3,
    });
    return this.store.store(node);
  }

  // ── Long-term memory ──────────────────────────────────────────────────────

  /**
   * Store a persistent fact that should survive session restarts.
   * Never expires. High importance by default.
   */
  public async storeLongTerm(
    content: string,
    tags: string[] = [],
    importance = 0.7
  ): Promise<MemoryNode> {
    this.logger.info('Memory', `🧠 Long-term stored: "${content.substring(0, 60)}"`);
    const node = createMemoryNode('long-term', content, {
      tags,
      importance,
      source: 'user',
    });
    return this.store.store(node);
  }

  // ── Preferences ───────────────────────────────────────────────────────────

  public async setPreference(key: string, value: string): Promise<void> {
    this.logger.info('Memory', `⚙️  Preference: "${key}" = "${value}"`);
    await this.store.setPreference(key, value);
    // Also mirror into the node store for full-text recall
    await this.store.store(createMemoryNode('preference',
      `User preference: ${key} = ${value}`,
      { tags: ['preference', key], importance: 0.6 }
    ));
  }

  public async getPreference(key: string): Promise<string | undefined> {
    const entry = await this.store.getPreference(key);
    return entry?.value;
  }

  public async getAllPreferences(): Promise<Record<string, string>> {
    const all = await this.store.getPreferences();
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(all)) {
      result[k] = v.value;
    }
    return result;
  }

  // ── Folders ───────────────────────────────────────────────────────────────

  public async trackFolder(path: string, label?: string): Promise<void> {
    this.logger.info('Memory', `📁 Folder tracked: "${path}"`);
    await this.store.trackFolder(path, label);
  }

  public async getFrequentFolders(limit = 10) {
    const all = await this.store.getFolders();
    return all.slice(0, limit);
  }

  // ── Applications ──────────────────────────────────────────────────────────

  public async trackApp(name: string, path?: string): Promise<void> {
    this.logger.info('Memory', `🚀 App tracked: "${name}"`);
    await this.store.trackApp(name, path);
  }

  public async getFrequentApps(limit = 10) {
    const all = await this.store.getApps();
    return all.slice(0, limit);
  }

  // ── Websites ──────────────────────────────────────────────────────────────

  public async trackWebsite(url: string, title?: string): Promise<void> {
    this.logger.info('Memory', `🌐 Website tracked: "${url}"`);
    await this.store.trackWebsite(url, title);
  }

  public async getFavoriteWebsites(limit = 10) {
    const all = await this.store.getWebsites();
    return all.slice(0, limit);
  }

  // ── Task history ──────────────────────────────────────────────────────────

  public async recordTask(
    description: string,
    intentAction: string,
    success: boolean,
    stepCount: number,
    durationMs?: number
  ): Promise<void> {
    this.logger.info('Memory', `📋 Task recorded: "${description}" | success=${success}`);
    await this.store.recordTask({ description, intentAction, success, stepCount, durationMs });
    // Also mirror into node store for recall
    await this.store.store(createMemoryNode('task',
      `Task: ${description} (${success ? 'succeeded' : 'failed'})`,
      {
        tags: ['task', intentAction, success ? 'success' : 'failed'],
        importance: success ? 0.5 : 0.4,
        expiresAt: expiresInDays(30), // Tasks expire after 30 days
        source: 'agent',
      }
    ));
  }

  public async getRecentTasks(limit = 20) {
    return this.store.getTasks(limit);
  }

  // ── Recall ────────────────────────────────────────────────────────────────

  /**
   * Recall memories relevant to a query across all (or specified) categories.
   * Returns scored, ranked results.
   */
  public async recall(query: string, options: RecallOptions = {}): Promise<RecallResult[]> {
    this.logger.info(
      'Memory',
      `🔍 Recall: "${query}"` +
      (options.categories ? ` [${options.categories.join(', ')}]` : ' [all]')
    );
    const results = await this.store.recall(query, options);
    this.logger.info('Memory', `🔍 Recall: ${results.length} match(es) found.`);
    return results;
  }

  // ── Generic node ops ──────────────────────────────────────────────────────

  public async getByCategory(category: MemoryCategory): Promise<MemoryNode[]> {
    return this.store.getByCategory(category);
  }

  public async getAll(): Promise<MemoryNode[]> {
    return this.store.getAll();
  }

  public async deleteNode(id: string): Promise<boolean> {
    this.logger.info('Memory', `🗑️  Delete node: ${id}`);
    return this.store.delete(id);
  }

  public async clearCategory(category: MemoryCategory): Promise<number> {
    this.logger.info('Memory', `🗑️  Clear category: ${category}`);
    return this.store.deleteCategory(category);
  }

  public async clearAll(): Promise<void> {
    this.logger.info('Memory', '🗑️  All memory cleared.');
    await this.store.clear();
  }

  // ── Maintenance ───────────────────────────────────────────────────────────

  public async evictExpired(): Promise<number> {
    const count = await this.store.evictExpired();
    if (count > 0) {
      this.logger.info('Memory', `♻️  Evicted ${count} expired memory node(s).`);
    }
    return count;
  }

  public async getStats(): Promise<MemoryStats> {
    return this.store.getStats();
  }
}
