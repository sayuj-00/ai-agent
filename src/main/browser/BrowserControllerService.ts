/**
 * Browser Controller Module — BrowserControllerService (Public Facade)
 *
 * Single public entry point for the entire Browser Controller module.
 * Wires the dependency graph and exposes a clean, minimal API.
 *
 * Dependency graph (wired here):
 *
 *   BrowserControllerService
 *     └── BrowserUseCase                  (application layer)
 *           └── ElectronBrowserDriver     (infrastructure)
 *                 ├── shell.openExternal  (Electron — opens system browser)
 *                 ├── https/http.get      (Node.js — file downloads)
 *                 └── SearchEngineRegistry (URL builder)
 *
 * Future: replace ElectronBrowserDriver with PlaywrightDriver here only.
 *
 * Callers import BrowserControllerService only — never internal layers.
 * Re-exports all domain types for convenience.
 */

import { LogService } from '../services/LogService.js';
import { ElectronBrowserDriver } from './infrastructure/ElectronBrowserDriver.js';
import { BrowserUseCase } from './application/BrowserUseCase.js';

// Re-export all public types — single import point
export type {
  BrowserTab, TabStatus,
  BrowserSession, SessionStatus,
  BrowserResult, NavigationResult,
  WebSearchResult, WebSearchResultItem,
  DownloadJob, DownloadStatus, DownloadResult,
} from './domain/BrowserSession.js';
export type { IBrowserDriver } from './domain/IBrowserDriver.js';

export class BrowserControllerService {
  private static instance: BrowserControllerService | null = null;
  private readonly useCase: BrowserUseCase;
  private readonly logger = LogService.getInstance();

  private constructor() {
    const driver   = new ElectronBrowserDriver();
    this.useCase   = new BrowserUseCase(driver);
    this.logger.info('BrowserController', 'Browser Controller initialized (clean architecture).');
    this.logger.info('BrowserController', 'Driver: ElectronBrowserDriver | Capabilities: launch · tabs · navigate · search · download · screenshot');
    this.logger.info('BrowserController', 'Note: Real page screenshots require PlaywrightDriver (future integration).');
  }

  public static getInstance(): BrowserControllerService {
    if (!BrowserControllerService.instance) {
      BrowserControllerService.instance = new BrowserControllerService();
    }
    return BrowserControllerService.instance;
  }

  // ── Session ───────────────────────────────────────────────────────────────

  /** Launch the browser. headed=true opens a visible window. */
  public async launch(headed = false) {
    return this.useCase.launch(headed);
  }

  /** Close all tabs and end the session. */
  public async close() {
    return this.useCase.close();
  }

  /** Get the current session state (status, open tabs, download count). */
  public getSession() {
    return this.useCase.getSession();
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────

  /** Open a new tab, optionally navigating to a URL. */
  public async openTab(url?: string) {
    return this.useCase.openTab(url);
  }

  /** Close a specific tab by ID. */
  public async closeTab(tabId: string) {
    return this.useCase.closeTab(tabId);
  }

  /** Bring a specific tab into focus. */
  public async focusTab(tabId: string) {
    return this.useCase.focusTab(tabId);
  }

  /** List all open tabs. */
  public listTabs() {
    return this.useCase.listTabs();
  }

  /** Get the currently active tab. */
  public getActiveTab() {
    return this.useCase.getActiveTab();
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  /**
   * Navigate to a URL.
   * If no browser session is open, one is launched automatically.
   * Bare strings without http:// are treated as search queries.
   */
  public async navigate(url: string, tabId?: string) {
    return this.useCase.navigate(url, tabId);
  }

  /** Navigate back in the active tab's history. */
  public async goBack(tabId?: string) {
    return this.useCase.goBack(tabId);
  }

  /** Navigate forward in the active tab's history. */
  public async goForward(tabId?: string) {
    return this.useCase.goForward(tabId);
  }

  /** Reload the active tab. */
  public async reload(tabId?: string) {
    return this.useCase.reload(tabId);
  }

  // ── Search ────────────────────────────────────────────────────────────────

  /**
   * Search the web for a query.
   * @param query  - Search terms
   * @param engine - 'google' | 'bing' | 'duckduckgo' (default: 'google')
   */
  public async search(
    query: string,
    engine: 'google' | 'bing' | 'duckduckgo' = 'google'
  ) {
    return this.useCase.search(query, engine);
  }

  // ── Downloads ─────────────────────────────────────────────────────────────

  /**
   * Download a file from a URL to a local path.
   * Tracks progress and supports cancellation.
   */
  public async download(url: string, destinationPath: string) {
    return this.useCase.download(url, destinationPath);
  }

  /** List all download jobs (pending, active, complete, failed). */
  public listDownloads() {
    return this.useCase.listDownloads();
  }

  /** Cancel an in-progress download by ID. */
  public async cancelDownload(downloadId: string) {
    return this.useCase.cancelDownload(downloadId);
  }

  // ── Screenshot ────────────────────────────────────────────────────────────

  /**
   * Capture a screenshot of the current browser view.
   * Note: Returns placeholder data until Playwright driver is integrated.
   */
  public async capturePageScreenshot() {
    return this.useCase.screenshot();
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  /** Force-close session. Call on app exit. */
  public cleanup(): void {
    this.useCase.cleanup();
  }

  // ── Legacy backward-compat API (existing controllers/BrowserController.ts) ──

  /** @deprecated Use getSession().status instead */
  public getSessionStatus() {
    const session = this.getSession();
    return { isOpen: session.status === 'open', url: this.getActiveTab()?.url ?? 'about:blank' };
  }
}
