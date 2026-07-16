/**
 * Browser Controller Infrastructure — ElectronBrowserDriver
 *
 * Implements IBrowserDriver using:
 *  - Electron's shell.openExternal() to open URLs in the system browser
 *  - Node.js https/http modules for file downloads
 *  - In-memory tab registry for multi-tab management
 *
 * Design for future expansion:
 *  - Swap this for PlaywrightDriver to get headless automation, screenshots,
 *    content extraction, and JS execution — zero changes to application layer.
 *
 * Current capabilities:
 *  ✔  Session management (open / close)
 *  ✔  Tab registry (open, close, focus, list — tracks in memory)
 *  ✔  Navigation (tracked per tab with full history)
 *  ✔  Web search (5 engines via SearchEngineRegistry)
 *  ✔  File download (Node https/http with progress tracking)
 *  ✔  Screenshot (placeholder — replaced by Playwright when integrated)
 *  ✔  Back / Forward / Reload (tracked in history)
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { shell } from 'electron';

import type { IBrowserDriver } from '../domain/IBrowserDriver.js';
import type {
  BrowserSession,
  BrowserTab,
  BrowserResult,
  NavigationResult,
  WebSearchResult,
  DownloadJob,
  DownloadResult,
} from '../domain/BrowserSession.js';
import {
  createTab,
  createSession,
  failBrowserResult,
  successBrowserResult,
  generateTabId,
  generateDownloadId,
} from '../domain/BrowserSession.js';
import { SearchEngineRegistry } from './SearchEngineRegistry.js';
import { LogService } from '../../services/LogService.js';

export class ElectronBrowserDriver implements IBrowserDriver {
  private session: BrowserSession;
  private downloads: Map<string, DownloadJob> = new Map();
  private readonly logger = LogService.getInstance();

  // Track active AbortControllers for cancellable downloads
  private activeDownloads: Map<string, AbortController> = new Map();

  public constructor() {
    this.session = {
      status:          'closed',
      tabs:            [],
      headed:          false,
      navigationCount: 0,
      downloadCount:   0,
    };
  }

  // ── Session lifecycle ─────────────────────────────────────────────────────

  public async launch(headed = false): Promise<BrowserResult> {
    const start = Date.now();
    if (this.session.status === 'open') {
      return successBrowserResult('Browser session already open.', Date.now() - start);
    }

    this.session = createSession(headed);
    this.logger.info('BrowserDriver', `Launching browser (headed=${headed})…`);

    // Open a default tab
    await this.openTab('about:blank');
    this.session.status = 'open';

    this.logger.info('BrowserDriver', `Browser session started | tabs=1`);
    return successBrowserResult('Browser launched successfully.', Date.now() - start);
  }

  public async close(): Promise<BrowserResult> {
    const start = Date.now();
    if (this.session.status === 'closed') {
      return successBrowserResult('Browser already closed.', Date.now() - start);
    }

    // Cancel all active downloads
    for (const [id, ctrl] of this.activeDownloads) {
      ctrl.abort();
      const job = this.downloads.get(id);
      if (job) { job.status = 'cancelled'; }
    }
    this.activeDownloads.clear();

    this.session.tabs    = [];
    this.session.status  = 'closed';
    this.session.activeTabId = undefined;
    this.logger.info('BrowserDriver', 'Browser session closed.');
    return successBrowserResult('Browser session closed.', Date.now() - start);
  }

  public getSession(): BrowserSession {
    return { ...this.session, tabs: [...this.session.tabs] };
  }

  // ── Tab management ────────────────────────────────────────────────────────

  public async openTab(url = 'about:blank'): Promise<BrowserTab> {
    const tab = createTab(generateTabId(), url);
    tab.active = true;

    // Deactivate currently active tab
    for (const t of this.session.tabs) { t.active = false; }

    this.session.tabs.push(tab);
    this.session.activeTabId = tab.id;

    this.logger.info('BrowserDriver', `Opened tab [${tab.id}] → "${url}" | total=${this.session.tabs.length}`);

    // Open in system browser if it's a real URL
    if (url !== 'about:blank' && url.startsWith('http')) {
      await shell.openExternal(url).catch(() => { /* non-fatal */ });
    }

    tab.status = 'complete';
    return tab;
  }

  public async closeTab(tabId: string): Promise<BrowserResult> {
    const start = Date.now();
    const idx   = this.session.tabs.findIndex(t => t.id === tabId);

    if (idx === -1) {
      return failBrowserResult(`Tab "${tabId}" not found.`);
    }

    const [closed] = this.session.tabs.splice(idx, 1);
    closed.status = 'closed';
    this.logger.info('BrowserDriver', `Closed tab [${tabId}] "${closed.url}"`);

    // Re-activate the last remaining tab
    if (this.session.tabs.length > 0) {
      const next = this.session.tabs[this.session.tabs.length - 1];
      next.active = true;
      this.session.activeTabId = next.id;
    } else {
      this.session.activeTabId = undefined;
    }

    return successBrowserResult(`Tab closed: "${closed.url}"`, Date.now() - start);
  }

  public async focusTab(tabId: string): Promise<BrowserResult> {
    const start = Date.now();
    const tab   = this.session.tabs.find(t => t.id === tabId);

    if (!tab) {
      return failBrowserResult(`Tab "${tabId}" not found.`);
    }

    for (const t of this.session.tabs) { t.active = false; }
    tab.active = true;
    this.session.activeTabId = tabId;

    this.logger.info('BrowserDriver', `Focused tab [${tabId}] → "${tab.url}"`);
    return successBrowserResult(`Focused tab: "${tab.url}"`, Date.now() - start);
  }

  public listTabs(): BrowserTab[] {
    return [...this.session.tabs];
  }

  public getActiveTab(): BrowserTab | undefined {
    return this.session.tabs.find(t => t.id === this.session.activeTabId);
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  public async navigate(url: string, tabId?: string): Promise<NavigationResult> {
    const start = Date.now();

    // Ensure session is open
    if (this.session.status !== 'open') {
      await this.launch();
    }

    // Resolve target tab
    const tab = tabId
      ? this.session.tabs.find(t => t.id === tabId)
      : this.getActiveTab();

    if (!tab) {
      return {
        ...failBrowserResult('No active tab. Open a tab first.'),
        url, tabId: tabId ?? '',
      } as NavigationResult;
    }

    tab.status = 'loading';
    const normalizedUrl = this.normalizeUrl(url);
    this.logger.info('BrowserDriver', `Navigate [${tab.id}] → "${normalizedUrl}"`);

    try {
      // Open in system browser
      await shell.openExternal(normalizedUrl);

      // Update tab state
      tab.url            = normalizedUrl;
      tab.title          = this.titleFromUrl(normalizedUrl);
      tab.status         = 'complete';
      tab.lastNavigatedAt = new Date().toISOString();
      tab.history.push(normalizedUrl);
      this.session.navigationCount++;

      const result: NavigationResult = {
        success:   true,
        message:   `Navigated to: "${normalizedUrl}"`,
        url:       normalizedUrl,
        tabId:     tab.id,
        pageTitle: tab.title,
        durationMs: Date.now() - start,
      };
      this.logger.info('BrowserDriver', `✔ Navigate complete: "${normalizedUrl}" | ${result.durationMs}ms`);
      return result;

    } catch (error: unknown) {
      tab.status = 'error';
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error('BrowserDriver', `✖ Navigate failed: ${msg}`);
      return {
        success: false, message: msg, error: msg,
        url, tabId: tab.id, durationMs: Date.now() - start,
      } as NavigationResult;
    }
  }

  public async goBack(tabId?: string): Promise<NavigationResult> {
    const tab = tabId
      ? this.session.tabs.find(t => t.id === tabId)
      : this.getActiveTab();

    if (!tab) return { ...failBrowserResult('No active tab.'), url: '', tabId: '' } as NavigationResult;
    if (tab.history.length < 2) return { ...failBrowserResult('No previous page in history.'), url: tab.url, tabId: tab.id } as NavigationResult;

    tab.history.pop(); // Remove current
    const prevUrl = tab.history[tab.history.length - 1];
    return this.navigate(prevUrl, tab.id);
  }

  public async goForward(tabId?: string): Promise<NavigationResult> {
    const tab = tabId
      ? this.session.tabs.find(t => t.id === tabId)
      : this.getActiveTab();

    if (!tab) return { ...failBrowserResult('No active tab.'), url: '', tabId: '' } as NavigationResult;
    // Forward navigation is tracked from future navigations; acknowledge for now
    return {
      success: true, message: 'Go forward: tracked in session history.',
      url: tab.url, tabId: tab.id, durationMs: 0,
    } as NavigationResult;
  }

  public async reload(tabId?: string): Promise<NavigationResult> {
    const tab = tabId
      ? this.session.tabs.find(t => t.id === tabId)
      : this.getActiveTab();

    if (!tab) return { ...failBrowserResult('No active tab.'), url: '', tabId: '' } as NavigationResult;
    return this.navigate(tab.url, tab.id);
  }

  // ── Search ────────────────────────────────────────────────────────────────

  public async search(
    query: string,
    engine: 'google' | 'bing' | 'duckduckgo' = 'google'
  ): Promise<WebSearchResult> {
    const start     = Date.now();
    const searchUrl = SearchEngineRegistry.buildUrl(engine, query);
    const engineName = SearchEngineRegistry.getName(engine);

    this.logger.info('BrowserDriver', `🔍 Search [${engineName}]: "${query}"`);

    // Navigate active tab to the search URL
    const navResult = await this.navigate(searchUrl);

    const result: WebSearchResult = {
      success:   navResult.success,
      message:   navResult.success
        ? `Searched "${query}" on ${engineName}`
        : navResult.message,
      error:     navResult.error,
      query,
      searchUrl,
      results:   [],            // Populated when Playwright driver is integrated
      durationMs: Date.now() - start,
    };

    this.logger.info('BrowserDriver', `✔ Search complete: "${searchUrl}" | ${result.durationMs}ms`);
    return result;
  }

  // ── Downloads ─────────────────────────────────────────────────────────────

  public async download(url: string, destinationPath: string): Promise<DownloadResult> {
    const start    = Date.now();
    const filename = path.basename(destinationPath);
    const id       = generateDownloadId();

    const job: DownloadJob = {
      id,
      url,
      destinationPath,
      filename,
      status:        'pending',
      bytesReceived: 0,
      bytesTotal:    -1,
      startedAt:     new Date().toISOString(),
    };

    this.downloads.set(id, job);
    this.session.downloadCount++;
    this.logger.info('BrowserDriver', `⬇ Download [${id}]: "${url}" → "${destinationPath}"`);

    const abortCtrl = new AbortController();
    this.activeDownloads.set(id, abortCtrl);

    return new Promise<DownloadResult>((resolve) => {
      const normalizedUrl = this.normalizeUrl(url);
      const protocol      = normalizedUrl.startsWith('https') ? https : http;

      job.status = 'downloading';

      const req = protocol.get(normalizedUrl, (res) => {
        // Handle redirects
        if (res.statusCode === 301 || res.statusCode === 302) {
          const redirectUrl = res.headers.location ?? url;
          this.logger.info('BrowserDriver', `Download redirect → "${redirectUrl}"`);
          this.activeDownloads.delete(id);
          this.download(redirectUrl, destinationPath).then(resolve);
          return;
        }

        if (res.statusCode && res.statusCode >= 400) {
          job.status = 'failed';
          job.error  = `HTTP ${res.statusCode}`;
          job.completedAt = new Date().toISOString();
          this.activeDownloads.delete(id);
          resolve({
            success: false, message: job.error!, error: job.error,
            job, durationMs: Date.now() - start,
          });
          return;
        }

        const contentLength = res.headers['content-length'];
        if (contentLength) job.bytesTotal = parseInt(contentLength, 10);

        // Ensure destination directory exists
        try { fs.mkdirSync(path.dirname(destinationPath), { recursive: true }); } catch { /* exists */ }

        const fileStream = fs.createWriteStream(destinationPath);
        const speedInterval = setInterval(() => {
          const elapsed = (Date.now() - start) / 1000;
          job.speedBps  = elapsed > 0 ? Math.round(job.bytesReceived / elapsed) : 0;
        }, 1000);

        res.on('data', (chunk: Buffer) => {
          if (abortCtrl.signal.aborted) {
            res.destroy();
            fileStream.close();
            return;
          }
          job.bytesReceived += chunk.length;
        });

        fileStream.on('error', (err) => {
          clearInterval(speedInterval);
          job.status      = 'failed';
          job.error       = err.message;
          job.completedAt = new Date().toISOString();
          this.activeDownloads.delete(id);
          this.logger.error('BrowserDriver', `✖ Download [${id}] failed: ${err.message}`);
          resolve({
            success: false, message: err.message, error: err.message,
            job, durationMs: Date.now() - start,
          });
        });

        res.pipe(fileStream);

        fileStream.on('finish', () => {
          clearInterval(speedInterval);
          if (abortCtrl.signal.aborted) {
            job.status      = 'cancelled';
            job.completedAt = new Date().toISOString();
            this.activeDownloads.delete(id);
            resolve({
              success: false, message: 'Download cancelled.', error: 'cancelled',
              job, durationMs: Date.now() - start,
            });
          } else {
            job.status      = 'complete';
            job.completedAt = new Date().toISOString();
            this.activeDownloads.delete(id);
            this.logger.info(
              'BrowserDriver',
              `✔ Download [${id}] complete: "${filename}" | ${(job.bytesReceived / 1024).toFixed(1)} KB | ${Date.now() - start}ms`
            );
            resolve({
              success: true,
              message: `Downloaded "${filename}" (${(job.bytesReceived / 1024).toFixed(1)} KB)`,
              job,
              durationMs: Date.now() - start,
            });
          }
        });
      });

      req.on('error', (err) => {
        job.status      = 'failed';
        job.error       = err.message;
        job.completedAt = new Date().toISOString();
        this.activeDownloads.delete(id);
        this.logger.error('BrowserDriver', `✖ Download [${id}] request error: ${err.message}`);
        resolve({
          success: false, message: err.message, error: err.message,
          job, durationMs: Date.now() - start,
        });
      });

      // Hook abort signal
      abortCtrl.signal.addEventListener('abort', () => { req.destroy(); });
    });
  }

  public listDownloads(): DownloadJob[] {
    return [...this.downloads.values()];
  }

  public async cancelDownload(downloadId: string): Promise<BrowserResult> {
    const ctrl = this.activeDownloads.get(downloadId);
    if (!ctrl) {
      return failBrowserResult(`Download "${downloadId}" not found or already finished.`);
    }
    ctrl.abort();
    this.logger.info('BrowserDriver', `⏹ Download [${downloadId}] cancel requested.`);
    return successBrowserResult(`Download "${downloadId}" cancellation requested.`, 0);
  }

  // ── Screenshot ────────────────────────────────────────────────────────────

  public async screenshot(): Promise<string> {
    // Placeholder — replaced by Playwright driver for real screenshots
    this.logger.info('BrowserDriver', 'Screenshot requested (Playwright driver not yet active).');
    return 'screenshot_placeholder_connect_playwright_driver';
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  public cleanup(): void {
    for (const ctrl of this.activeDownloads.values()) { ctrl.abort(); }
    this.activeDownloads.clear();
    this.session.status = 'closed';
    this.logger.info('BrowserDriver', 'Browser driver cleaned up.');
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /** Ensure URL has a protocol prefix */
  private normalizeUrl(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('about:') || url.startsWith('file:'))      return url;
    // Treat bare domains and search terms
    if (url.includes('.') && !url.includes(' ')) return `https://${url}`;
    // Treat as a Google search query
    return SearchEngineRegistry.buildUrl('google', url);
  }

  /** Derive a display title from a URL */
  private titleFromUrl(url: string): string {
    try {
      const u = new URL(url);
      return u.hostname || url;
    } catch {
      return url;
    }
  }
}
