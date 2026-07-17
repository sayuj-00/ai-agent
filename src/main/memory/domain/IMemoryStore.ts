/**
 * Memory Module Domain — IMemoryStore (Input Port)
 *
 * The interface the application layer uses for all memory operations.
 * The application layer ONLY depends on this interface — never on any
 * concrete storage backend.
 *
 * Current implementation: InMemoryStore (in-process Map)
 * Future:
 *  - SQLiteMemoryStore (persistent across restarts)
 *  - VectorMemoryStore (semantic search via embeddings)
 *  - RemoteMemoryStore (cloud sync)
 */

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
} from './MemoryTypes.js';

export interface IMemoryStore {
  // ── Generic node operations ────────────────────────────────────────────────

  /** Store a new memory node */
  store(node: MemoryNode): Promise<MemoryNode>;

  /** Retrieve a single node by ID */
  get(id: string): Promise<MemoryNode | undefined>;

  /** Update a node's content/tags/importance */
  update(id: string, patch: Partial<Pick<MemoryNode, 'content' | 'tags' | 'importance' | 'expiresAt'>>): Promise<MemoryNode | undefined>;

  /** Delete a specific node */
  delete(id: string): Promise<boolean>;

  /** Delete all nodes of a specific category */
  deleteCategory(category: MemoryCategory): Promise<number>;

  /** Clear all memory */
  clear(): Promise<void>;

  // ── Query / recall ─────────────────────────────────────────────────────────

  /** Full-text + tag recall across all (or specified) categories */
  recall(query: string, options?: RecallOptions): Promise<RecallResult[]>;

  /** Get all nodes in a category */
  getByCategory(category: MemoryCategory): Promise<MemoryNode[]>;

  /** Get all nodes */
  getAll(): Promise<MemoryNode[]>;

  // ── Typed accessors ────────────────────────────────────────────────────────

  /** Get all stored user preferences as a key→value map */
  getPreferences(): Promise<Record<string, PreferenceEntry>>;

  /** Get a specific preference by key */
  getPreference(key: string): Promise<PreferenceEntry | undefined>;

  /** Set a user preference */
  setPreference(key: string, value: string): Promise<PreferenceEntry>;

  /** Get all tracked folder entries sorted by access count */
  getFolders(): Promise<FolderEntry[]>;

  /** Record a folder access (creates entry if new) */
  trackFolder(path: string, label?: string): Promise<FolderEntry>;

  /** Get all tracked application entries sorted by launch count */
  getApps(): Promise<AppEntry[]>;

  /** Record an app launch (creates entry if new) */
  trackApp(name: string, path?: string): Promise<AppEntry>;

  /** Get all tracked website entries sorted by visit count */
  getWebsites(): Promise<WebsiteEntry[]>;

  /** Record a website visit (creates entry if new) */
  trackWebsite(url: string, title?: string): Promise<WebsiteEntry>;

  /** Get recent task history */
  getTasks(limit?: number): Promise<TaskEntry[]>;

  /** Record a completed task */
  recordTask(entry: Omit<TaskEntry, 'executedAt'>): Promise<TaskEntry>;

  // ── Maintenance ────────────────────────────────────────────────────────────

  /** Remove all expired memory nodes */
  evictExpired(): Promise<number>;

  /** Get statistics about the current memory state */
  getStats(): Promise<MemoryStats>;
}
