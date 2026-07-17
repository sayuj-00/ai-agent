/**
 * Memory Module Infrastructure — InMemoryStore
 *
 * Implements IMemoryStore using in-process Maps.
 * Fast, zero-dependency, ready to be swapped for SQLite or vector DB later.
 *
 * Responsibilities:
 *  - Generic MemoryNode CRUD
 *  - Full-text + tag recall via MemoryScorer
 *  - Typed stores: preferences, folders, apps, websites, tasks
 *  - Expiry eviction
 *  - Statistics
 *
 * Design for extensibility:
 *  - Replace this class with SQLiteMemoryStore for persistence
 *  - Replace with VectorMemoryStore for semantic search
 *  - Zero changes to MemoryUseCase or MemoryService
 */

import type { IMemoryStore } from '../domain/IMemoryStore.js';
import type {
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
} from '../domain/MemoryTypes.js';
import { isExpired } from '../domain/MemoryTypes.js';
import { MemoryScorer } from './MemoryScorer.js';

// ── Limits ───────────────────────────────────────────────────────────────────
const MAX_SHORT_TERM  = 100;  // Auto-evict oldest short-term over this limit
const MAX_TASKS       = 200;  // Keep last N tasks
const MAX_WEBSITES    = 500;  // Keep top N websites by visit count

export class InMemoryStore implements IMemoryStore {
  // Primary node store
  private nodes  = new Map<string, MemoryNode>();

  // Typed secondary stores
  private preferences = new Map<string, PreferenceEntry>();
  private folders     = new Map<string, FolderEntry>();   // keyed by path
  private apps        = new Map<string, AppEntry>();      // keyed by name.lower
  private websites    = new Map<string, WebsiteEntry>(); // keyed by url
  private tasks:      TaskEntry[] = [];

  // ── Generic node operations ────────────────────────────────────────────────

  public async store(node: MemoryNode): Promise<MemoryNode> {
    this.nodes.set(node.id, node);

    // Enforce short-term cap
    if (node.category === 'short-term') {
      this.enforceShortTermCap();
    }

    return node;
  }

  public async get(id: string): Promise<MemoryNode | undefined> {
    const node = this.nodes.get(id);
    if (node) {
      node.accessCount++;
      node.lastAccessedAt = new Date().toISOString();
    }
    return node;
  }

  public async update(
    id: string,
    patch: Partial<Pick<MemoryNode, 'content' | 'tags' | 'importance' | 'expiresAt'>>
  ): Promise<MemoryNode | undefined> {
    const node = this.nodes.get(id);
    if (!node) return undefined;
    Object.assign(node, patch);
    return node;
  }

  public async delete(id: string): Promise<boolean> {
    return this.nodes.delete(id);
  }

  public async deleteCategory(category: MemoryCategory): Promise<number> {
    let count = 0;
    for (const [id, node] of this.nodes) {
      if (node.category === category) {
        this.nodes.delete(id);
        count++;
      }
    }
    return count;
  }

  public async clear(): Promise<void> {
    this.nodes.clear();
    this.preferences.clear();
    this.folders.clear();
    this.apps.clear();
    this.websites.clear();
    this.tasks = [];
  }

  // ── Query / recall ─────────────────────────────────────────────────────────

  public async recall(query: string, options: RecallOptions = {}): Promise<RecallResult[]> {
    const {
      categories,
      minScore  = 0.1,
      limit     = 20,
      includeExpired = false,
      sortBy    = 'relevance',
    } = options;

    const candidates = [...this.nodes.values()].filter(node => {
      if (!includeExpired && isExpired(node)) return false;
      if (categories && categories.length > 0 && !categories.includes(node.category)) return false;
      return true;
    });

    const ranked = MemoryScorer.rankNodes(candidates, query, minScore);

    // Apply sort preference
    if (sortBy === 'recency') {
      ranked.sort((a, b) =>
        new Date(b.node.lastAccessedAt).getTime() - new Date(a.node.lastAccessedAt).getTime()
      );
    } else if (sortBy === 'frequency') {
      ranked.sort((a, b) => b.node.accessCount - a.node.accessCount);
    }

    // Mark accessed
    const results = ranked.slice(0, limit).map(r => {
      r.node.accessCount++;
      r.node.lastAccessedAt = new Date().toISOString();
      return {
        node:      r.node,
        score:     r.score,
        matchedOn: r.matchedOn,
      } as RecallResult;
    });

    return results;
  }

  public async getByCategory(category: MemoryCategory): Promise<MemoryNode[]> {
    return [...this.nodes.values()]
      .filter(n => n.category === category && !isExpired(n))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async getAll(): Promise<MemoryNode[]> {
    return [...this.nodes.values()];
  }

  // ── Preferences ────────────────────────────────────────────────────────────

  public async getPreferences(): Promise<Record<string, PreferenceEntry>> {
    return Object.fromEntries(this.preferences);
  }

  public async getPreference(key: string): Promise<PreferenceEntry | undefined> {
    return this.preferences.get(key.toLowerCase());
  }

  public async setPreference(key: string, value: string): Promise<PreferenceEntry> {
    const k = key.toLowerCase();
    const entry: PreferenceEntry = {
      key: k,
      value,
      updatedAt: new Date().toISOString(),
    };
    this.preferences.set(k, entry);
    return entry;
  }

  // ── Folders ────────────────────────────────────────────────────────────────

  public async getFolders(): Promise<FolderEntry[]> {
    return [...this.folders.values()]
      .sort((a, b) => b.accessCount - a.accessCount);
  }

  public async trackFolder(path: string, label?: string): Promise<FolderEntry> {
    const existing = this.folders.get(path);
    if (existing) {
      existing.accessCount++;
      existing.lastAccessedAt = new Date().toISOString();
      return existing;
    }
    const entry: FolderEntry = {
      path,
      label: label ?? path.split(/[\\/]/).pop() ?? path,
      accessCount: 1,
      lastAccessedAt: new Date().toISOString(),
      pinned: false,
    };
    this.folders.set(path, entry);
    return entry;
  }

  // ── Applications ───────────────────────────────────────────────────────────

  public async getApps(): Promise<AppEntry[]> {
    return [...this.apps.values()]
      .sort((a, b) => b.launchCount - a.launchCount);
  }

  public async trackApp(name: string, path?: string): Promise<AppEntry> {
    const key = name.toLowerCase();
    const existing = this.apps.get(key);
    if (existing) {
      existing.launchCount++;
      existing.lastLaunchedAt = new Date().toISOString();
      if (path) existing.path = path;
      return existing;
    }
    const entry: AppEntry = {
      name,
      path,
      launchCount: 1,
      lastLaunchedAt: new Date().toISOString(),
      pinned: false,
    };
    this.apps.set(key, entry);
    return entry;
  }

  // ── Websites ───────────────────────────────────────────────────────────────

  public async getWebsites(): Promise<WebsiteEntry[]> {
    return [...this.websites.values()]
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, MAX_WEBSITES);
  }

  public async trackWebsite(url: string, title?: string): Promise<WebsiteEntry> {
    const existing = this.websites.get(url);
    if (existing) {
      existing.visitCount++;
      existing.lastVisitedAt = new Date().toISOString();
      if (title) existing.title = title;
      return existing;
    }
    const entry: WebsiteEntry = {
      url,
      title: title ?? url,
      visitCount: 1,
      lastVisitedAt: new Date().toISOString(),
      favorite: false,
    };
    this.websites.set(url, entry);
    return entry;
  }

  // ── Tasks ──────────────────────────────────────────────────────────────────

  public async getTasks(limit = 50): Promise<TaskEntry[]> {
    return [...this.tasks]
      .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime())
      .slice(0, limit);
  }

  public async recordTask(entry: Omit<TaskEntry, 'executedAt'>): Promise<TaskEntry> {
    const task: TaskEntry = {
      ...entry,
      executedAt: new Date().toISOString(),
    };
    this.tasks.unshift(task);
    // Cap task history
    if (this.tasks.length > MAX_TASKS) {
      this.tasks = this.tasks.slice(0, MAX_TASKS);
    }
    return task;
  }

  // ── Maintenance ────────────────────────────────────────────────────────────

  public async evictExpired(): Promise<number> {
    let count = 0;
    const now = new Date();
    for (const [id, node] of this.nodes) {
      if (node.expiresAt && new Date(node.expiresAt) < now) {
        this.nodes.delete(id);
        count++;
      }
    }
    return count;
  }

  public async getStats(): Promise<MemoryStats> {
    const all = [...this.nodes.values()];
    const byCategory: Partial<Record<MemoryCategory, number>> = {};
    let totalAccesses = 0;
    let oldest: string | undefined;
    let newest: string | undefined;

    for (const node of all) {
      byCategory[node.category] = (byCategory[node.category] ?? 0) + 1;
      totalAccesses += node.accessCount;
      if (!oldest || node.createdAt < oldest) oldest = node.createdAt;
      if (!newest || node.createdAt > newest) newest = node.createdAt;
    }

    return {
      total:         all.length,
      byCategory: {
        'short-term':  byCategory['short-term']  ?? 0,
        'long-term':   byCategory['long-term']   ?? 0,
        'preference':  byCategory['preference']  ?? 0,
        'folder':      byCategory['folder']      ?? 0,
        'application': byCategory['application'] ?? 0,
        'website':     byCategory['website']     ?? 0,
        'task':        byCategory['task']        ?? 0,
      },
      oldestEntry:   oldest,
      newestEntry:   newest,
      totalAccesses,
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private enforceShortTermCap(): void {
    const shortTermNodes = [...this.nodes.values()]
      .filter(n => n.category === 'short-term')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    while (shortTermNodes.length > MAX_SHORT_TERM) {
      const oldest = shortTermNodes.shift();
      if (oldest) this.nodes.delete(oldest.id);
    }
  }
}
