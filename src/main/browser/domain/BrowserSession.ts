/**
 * Browser Controller Domain — BrowserSession
 *
 * Core data models for the Browser Controller module.
 * Pure types — ZERO imports.
 *
 * Rules:
 *  - No imports from Node.js, Electron, or any service.
 *  - All types here are stable contracts across all Browser Controller layers.
 */

// ---------------------------------------------------------------------------
// Tab types
// ---------------------------------------------------------------------------

/** Lifecycle state of a single browser tab */
export type TabStatus =
  | 'idle'       // Open, at a URL, no activity
  | 'loading'    // Actively navigating to a URL
  | 'complete'   // Navigation finished successfully
  | 'error'      // Navigation or load failed
  | 'closed';    // Tab has been closed

/** A single browser tab */
export interface BrowserTab {
  /** Unique tab identifier */
  id: string;

  /** Tab display title (from page title or URL) */
  title: string;

  /** Current URL of the tab */
  url: string;

  /** Whether this is the currently focused tab */
  active: boolean;

  /** Current lifecycle status */
  status: TabStatus;

  /** ISO 8601 timestamp when the tab was opened */
  openedAt: string;

  /** ISO 8601 timestamp of the last navigation */
  lastNavigatedAt?: string;

  /** Full navigation history for this tab (most recent last) */
  history: string[];
}

// ---------------------------------------------------------------------------
// Session types
// ---------------------------------------------------------------------------

/** Lifecycle state of the browser session */
export type SessionStatus =
  | 'closed'   // Not running
  | 'starting' // Launching
  | 'open'     // Running, ready for commands
  | 'error';   // Failed to start or crashed

/** The full browser session state */
export interface BrowserSession {
  /** Whether the browser is currently running */
  status: SessionStatus;

  /** All open tabs */
  tabs: BrowserTab[];

  /** ID of the currently active tab (undefined if no tabs open) */
  activeTabId?: string;

  /** Mode: headed = visible window, headless = background */
  headed: boolean;

  /** ISO 8601 timestamp when session was started */
  startedAt?: string;

  /** Total number of navigations in this session */
  navigationCount: number;

  /** Total number of downloads in this session */
  downloadCount: number;
}

// ---------------------------------------------------------------------------
// Operation result types
// ---------------------------------------------------------------------------

/** Result of any browser operation */
export interface BrowserResult {
  success: boolean;
  message: string;
  error?: string;
  durationMs: number;
}

/** Result of a navigation operation */
export interface NavigationResult extends BrowserResult {
  /** The URL that was navigated to */
  url: string;

  /** The tab that performed the navigation */
  tabId: string;

  /** Page title (if retrievable) */
  pageTitle?: string;

  /** HTTP status code (if available) */
  statusCode?: number;
}

/** A single web search result item */
export interface WebSearchResultItem {
  /** Result title */
  title: string;

  /** Result URL */
  url: string;

  /** Short description snippet */
  snippet: string;

  /** Rank in the results (1 = top result) */
  rank: number;
}

/** Result of a web search operation */
export interface WebSearchResult extends BrowserResult {
  /** The query that was searched */
  query: string;

  /** The search engine URL used */
  searchUrl: string;

  /** Parsed result items (if available) */
  results: WebSearchResultItem[];
}

/** Download status */
export type DownloadStatus =
  | 'pending'     // Queued, not started
  | 'downloading' // In progress
  | 'complete'    // Finished successfully
  | 'failed'      // Failed
  | 'cancelled';  // Cancelled by user

/** A download job */
export interface DownloadJob {
  /** Unique download ID */
  id: string;

  /** The URL being downloaded */
  url: string;

  /** Absolute path where the file will be saved */
  destinationPath: string;

  /** Filename (basename of destinationPath) */
  filename: string;

  /** Current download status */
  status: DownloadStatus;

  /** Bytes downloaded so far */
  bytesReceived: number;

  /** Total expected bytes (-1 if unknown) */
  bytesTotal: number;

  /** ISO 8601 timestamp when download started */
  startedAt: string;

  /** ISO 8601 timestamp when download finished (success or failure) */
  completedAt?: string;

  /** Error message if status = 'failed' */
  error?: string;

  /** Download speed in bytes/sec (approximate) */
  speedBps?: number;
}

/** Result of a download operation */
export interface DownloadResult extends BrowserResult {
  /** The completed or failed DownloadJob */
  job: DownloadJob;
}

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

export function createTab(id: string, url: string): BrowserTab {
  return {
    id,
    title: url,
    url,
    active: false,
    status: 'idle',
    openedAt: new Date().toISOString(),
    history: [url],
  };
}

export function createSession(headed: boolean): BrowserSession {
  return {
    status: 'starting',
    tabs: [],
    headed,
    startedAt: new Date().toISOString(),
    navigationCount: 0,
    downloadCount: 0,
  };
}

export function failBrowserResult(error: string, durationMs = 0): BrowserResult {
  return { success: false, message: error, error, durationMs };
}

export function successBrowserResult(message: string, durationMs: number, extras: object = {}): BrowserResult {
  return { success: true, message, durationMs, ...extras };
}

/** Generate a unique tab ID */
export function generateTabId(): string {
  return `tab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/** Generate a unique download ID */
export function generateDownloadId(): string {
  return `dl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}
