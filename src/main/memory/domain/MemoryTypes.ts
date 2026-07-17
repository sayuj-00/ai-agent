/**
 * Memory Module Domain — MemoryTypes
 *
 * All core data contracts for the Memory module.
 * Pure types — ZERO imports, zero runtime dependencies.
 *
 * Rules:
 *  - No imports from Node.js, Electron, services, or other modules.
 *  - These types are the stable shared contract across every Memory layer.
 *
 * Memory taxonomy (7 types):
 *  1. short-term      — Current conversation turns (auto-expires)
 *  2. long-term       — Persistent facts the user has told the agent
 *  3. preference      — User preferences (theme, language, behavior)
 *  4. folder          — Frequently used folder paths
 *  5. application     — Frequently used desktop applications
 *  6. website         — Favorite/recent websites
 *  7. task            — Recent tasks the agent executed
 */

// ---------------------------------------------------------------------------
// Memory category taxonomy
// ---------------------------------------------------------------------------

/** All supported memory categories */
export type MemoryCategory =
  | 'short-term'   // Conversation turns — auto-expires
  | 'long-term'    // Persistent semantic facts
  | 'preference'   // User preferences (settings-level)
  | 'folder'       // Frequently accessed folder paths
  | 'application'  // Frequently used desktop apps
  | 'website'      // Favorite or frequent websites
  | 'task';        // Recent agent tasks (what was done)

// ---------------------------------------------------------------------------
// Core memory node
// ---------------------------------------------------------------------------

/** A single stored memory item */
export interface MemoryNode {
  /** Unique identifier */
  id: string;

  /** Memory category */
  category: MemoryCategory;

  /** The stored content (text for most types, structured JSON for typed nodes) */
  content: string;

  /** Searchable tags for fast recall */
  tags: string[];

  /** ISO 8601 creation timestamp */
  createdAt: string;

  /** ISO 8601 last-accessed timestamp (updated on recall) */
  lastAccessedAt: string;

  /** ISO 8601 expiry timestamp — undefined means never expires */
  expiresAt?: string;

  /** Relevance score 0–1 (set by recall, not stored) */
  relevanceScore?: number;

  /** Access count — how many times this node was recalled */
  accessCount: number;

  /** Importance weight 0–1 (higher = retained longer) */
  importance: number;

  /** Source of this memory — how it was created */
  source: 'user' | 'agent' | 'system';
}

// ---------------------------------------------------------------------------
// Typed sub-nodes for structured categories
// ---------------------------------------------------------------------------

/** User preference entry */
export interface PreferenceEntry {
  /** Preference key (e.g. "theme", "language", "default_browser") */
  key: string;
  /** Preference value (always string — caller casts) */
  value: string;
  /** ISO 8601 last-updated timestamp */
  updatedAt: string;
}

/** A folder the user frequently accesses */
export interface FolderEntry {
  /** Absolute path to the folder */
  path: string;
  /** Human-readable label (e.g. "Projects", "Downloads") */
  label: string;
  /** How many times the user opened this folder */
  accessCount: number;
  /** ISO 8601 last-accessed timestamp */
  lastAccessedAt: string;
  /** Whether this is pinned (always shown, never auto-evicted) */
  pinned: boolean;
}

/** A frequently used desktop application */
export interface AppEntry {
  /** Application name (e.g. "VS Code", "Chrome") */
  name: string;
  /** Absolute path to the executable */
  path?: string;
  /** How many times the agent launched this app */
  launchCount: number;
  /** ISO 8601 last-launched timestamp */
  lastLaunchedAt: string;
  /** Whether this app is pinned */
  pinned: boolean;
}

/** A favorite or frequently visited website */
export interface WebsiteEntry {
  /** Full URL (e.g. "https://github.com") */
  url: string;
  /** Human-readable title */
  title: string;
  /** Visit count */
  visitCount: number;
  /** ISO 8601 last-visited timestamp */
  lastVisitedAt: string;
  /** Whether this is a favorite */
  favorite: boolean;
}

/** A recent task the agent performed */
export interface TaskEntry {
  /** Short human-readable description (e.g. "Created Python project") */
  description: string;
  /** Intent action that triggered this task */
  intentAction: string;
  /** ISO 8601 when the task was run */
  executedAt: string;
  /** Whether the task completed successfully */
  success: boolean;
  /** Number of steps in the plan */
  stepCount: number;
  /** Duration in milliseconds */
  durationMs?: number;
}

// ---------------------------------------------------------------------------
// Recall / query types
// ---------------------------------------------------------------------------

/** Options for a memory recall query */
export interface RecallOptions {
  /** Categories to search (defaults to all) */
  categories?: MemoryCategory[];
  /** Minimum relevance score 0–1 (default 0) */
  minScore?: number;
  /** Maximum results to return (default 20) */
  limit?: number;
  /** Include expired memories (default false) */
  includeExpired?: boolean;
  /** Sort by: relevance | recency | frequency */
  sortBy?: 'relevance' | 'recency' | 'frequency';
}

/** A single recall result with its score */
export interface RecallResult {
  node: MemoryNode;
  score: number;
  matchedOn: ('content' | 'tags' | 'category')[];
}

/** Statistics about the current memory state */
export interface MemoryStats {
  total: number;
  byCategory: Record<MemoryCategory, number>;
  oldestEntry?: string;
  newestEntry?: string;
  totalAccesses: number;
}

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

/** Generate a unique memory ID */
export function generateMemoryId(): string {
  return `mem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/** Create a new MemoryNode with sensible defaults */
export function createMemoryNode(
  category: MemoryCategory,
  content: string,
  options: {
    tags?: string[];
    expiresAt?: string;
    importance?: number;
    source?: MemoryNode['source'];
  } = {}
): MemoryNode {
  const now = new Date().toISOString();
  return {
    id:             generateMemoryId(),
    category,
    content,
    tags:           options.tags ?? [],
    createdAt:      now,
    lastAccessedAt: now,
    expiresAt:      options.expiresAt,
    accessCount:    0,
    importance:     options.importance ?? 0.5,
    source:         options.source ?? 'user',
  };
}

/** Compute ISO expiry timestamp N minutes from now */
export function expiresInMinutes(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

/** Compute ISO expiry timestamp N days from now */
export function expiresInDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

/** Check if a MemoryNode is expired */
export function isExpired(node: MemoryNode): boolean {
  if (!node.expiresAt) return false;
  return new Date(node.expiresAt) < new Date();
}
