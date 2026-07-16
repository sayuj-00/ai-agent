/**
 * Browser Controller Application Layer — BrowserUseCase
 *
 * Orchestrates all browser operations through IBrowserDriver.
 *
 * Rules (Clean Architecture):
 *  - Only imports from domain/ (types + interfaces).
 *  - Has ZERO knowledge of ElectronBrowserDriver, shell, or https.
 *  - Adds structured logging around every operation.
 *  - Every method returns a typed result — never throws.
 *  - Fully testable by injecting a MockBrowserDriver.
 */

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
import { LogService } from '../../services/LogService.js';

export class BrowserUseCase {
  private readonly logger = LogService.getInstance();

  constructor(private readonly driver: IBrowserDriver) {}

  // ── Session ───────────────────────────────────────────────────────────────

  public async launch(headed = false): Promise<BrowserResult> {
    this.logger.info('BrowserController', `🌐 Launching browser (headed=${headed})…`);
    const result = await this.driver.launch(headed);
    this.logResult('Launch', result);
    return result;
  }

  public async close(): Promise<BrowserResult> {
    this.logger.info('BrowserController', '🌐 Closing browser session…');
    const result = await this.driver.close();
    this.logResult('Close', result);
    return result;
  }

  public getSession(): BrowserSession {
    return this.driver.getSession();
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────

  public async openTab(url?: string): Promise<BrowserTab> {
    this.logger.info('BrowserController', `📑 Open tab${url ? `: "${url}"` : ' (blank)'}`);
    const tab = await this.driver.openTab(url);
    this.logger.info('BrowserController', `✔ Tab opened [${tab.id}]`);
    return tab;
  }

  public async closeTab(tabId: string): Promise<BrowserResult> {
    this.logger.info('BrowserController', `📑 Close tab [${tabId}]`);
    const result = await this.driver.closeTab(tabId);
    this.logResult('Close tab', result);
    return result;
  }

  public async focusTab(tabId: string): Promise<BrowserResult> {
    this.logger.info('BrowserController', `📑 Focus tab [${tabId}]`);
    const result = await this.driver.focusTab(tabId);
    this.logResult('Focus tab', result);
    return result;
  }

  public listTabs(): BrowserTab[] {
    return this.driver.listTabs();
  }

  public getActiveTab(): BrowserTab | undefined {
    return this.driver.getActiveTab();
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  public async navigate(url: string, tabId?: string): Promise<NavigationResult> {
    this.logger.info('BrowserController', `🧭 Navigate → "${url}"`);
    const result = await this.driver.navigate(url, tabId);
    this.logResult('Navigate', result);
    return result;
  }

  public async goBack(tabId?: string): Promise<NavigationResult> {
    this.logger.info('BrowserController', '🧭 Go back');
    const result = await this.driver.goBack(tabId);
    this.logResult('Back', result);
    return result;
  }

  public async goForward(tabId?: string): Promise<NavigationResult> {
    this.logger.info('BrowserController', '🧭 Go forward');
    const result = await this.driver.goForward(tabId);
    this.logResult('Forward', result);
    return result;
  }

  public async reload(tabId?: string): Promise<NavigationResult> {
    this.logger.info('BrowserController', '🧭 Reload');
    const result = await this.driver.reload(tabId);
    this.logResult('Reload', result);
    return result;
  }

  // ── Search ────────────────────────────────────────────────────────────────

  public async search(
    query: string,
    engine: 'google' | 'bing' | 'duckduckgo' = 'google'
  ): Promise<WebSearchResult> {
    this.logger.info('BrowserController', `🔍 Search [${engine}]: "${query}"`);
    const result = await this.driver.search(query, engine);
    this.logResult('Search', result);
    return result;
  }

  // ── Downloads ─────────────────────────────────────────────────────────────

  public async download(url: string, destinationPath: string): Promise<DownloadResult> {
    this.logger.info('BrowserController', `⬇ Download: "${url}" → "${destinationPath}"`);
    const result = await this.driver.download(url, destinationPath);
    this.logResult('Download', result);
    return result;
  }

  public listDownloads(): DownloadJob[] {
    return this.driver.listDownloads();
  }

  public async cancelDownload(downloadId: string): Promise<BrowserResult> {
    this.logger.info('BrowserController', `⏹ Cancel download [${downloadId}]`);
    const result = await this.driver.cancelDownload(downloadId);
    this.logResult('Cancel download', result);
    return result;
  }

  // ── Screenshot ────────────────────────────────────────────────────────────

  public async screenshot(): Promise<string> {
    this.logger.info('BrowserController', '📷 Screenshot requested');
    const data = await this.driver.screenshot();
    this.logger.info('BrowserController', '✔ Screenshot captured');
    return data;
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  public cleanup(): void {
    this.driver.cleanup();
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private logResult(op: string, result: BrowserResult): void {
    if (result.success) {
      this.logger.info('BrowserController', `✔ ${op}: ${result.message} | ${result.durationMs}ms`);
    } else {
      this.logger.error('BrowserController', `✖ ${op} failed: ${result.error}`);
    }
  }
}
