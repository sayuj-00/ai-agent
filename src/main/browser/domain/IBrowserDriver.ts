/**
 * Browser Controller Domain — IBrowserDriver
 *
 * The interface the application layer uses to control the browser.
 * The application layer ONLY depends on this interface.
 *
 * Current implementation: ElectronBrowserDriver (uses Electron shell + Node https)
 * Future swap:           PlaywrightDriver (full browser automation, zero other changes)
 *
 * Rules:
 *  - All methods are async and return typed results.
 *  - Implementations live in infrastructure/.
 *  - Application layer never imports a concrete driver.
 */

import type {
  BrowserSession,
  BrowserTab,
  BrowserResult,
  NavigationResult,
  WebSearchResult,
  DownloadJob,
  DownloadResult,
} from './BrowserSession.js';

export interface IBrowserDriver {
  // ── Session lifecycle ─────────────────────────────────────────────────────

  /** Launch the browser and start a session */
  launch(headed: boolean): Promise<BrowserResult>;

  /** Close all tabs and end the session */
  close(): Promise<BrowserResult>;

  /** Get the full current session state */
  getSession(): BrowserSession;

  // ── Tab management ────────────────────────────────────────────────────────

  /** Open a new tab, optionally navigating to a URL */
  openTab(url?: string): Promise<BrowserTab>;

  /** Close a tab by ID */
  closeTab(tabId: string): Promise<BrowserResult>;

  /** Switch focus to a tab by ID */
  focusTab(tabId: string): Promise<BrowserResult>;

  /** List all open tabs */
  listTabs(): BrowserTab[];

  /** Get the currently active tab */
  getActiveTab(): BrowserTab | undefined;

  // ── Navigation ────────────────────────────────────────────────────────────

  /** Navigate the active tab (or a specific tab) to a URL */
  navigate(url: string, tabId?: string): Promise<NavigationResult>;

  /** Go back in history for the active tab */
  goBack(tabId?: string): Promise<NavigationResult>;

  /** Go forward in history for the active tab */
  goForward(tabId?: string): Promise<NavigationResult>;

  /** Reload the active tab */
  reload(tabId?: string): Promise<NavigationResult>;

  // ── Search ────────────────────────────────────────────────────────────────

  /**
   * Perform a web search.
   * Opens a search URL in the active tab.
   * @param query        - The search query
   * @param engine       - Search engine to use ('google' | 'bing' | 'duckduckgo')
   */
  search(query: string, engine?: 'google' | 'bing' | 'duckduckgo'): Promise<WebSearchResult>;

  // ── Downloads ─────────────────────────────────────────────────────────────

  /**
   * Download a file from a URL to a local path.
   * @param url              - The URL to download
   * @param destinationPath  - Absolute path to save the file
   */
  download(url: string, destinationPath: string): Promise<DownloadResult>;

  /** List all download jobs in this session */
  listDownloads(): DownloadJob[];

  /** Cancel an active download */
  cancelDownload(downloadId: string): Promise<BrowserResult>;

  // ── Screenshot ────────────────────────────────────────────────────────────

  /** Capture a screenshot of the current view */
  screenshot(): Promise<string>;

  // ── Cleanup ───────────────────────────────────────────────────────────────

  /** Force-close all sessions (called on app exit) */
  cleanup(): void;
}
