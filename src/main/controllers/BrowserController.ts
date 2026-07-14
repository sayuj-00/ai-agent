import { LogService } from '../services/LogService.js';

export class BrowserController {
  private static instance: BrowserController | null = null;
  private logger = LogService.getInstance();
  private isBrowserOpen = false;
  private currentUrl = 'about:blank';

  private constructor() {
    this.logger.info('BrowserController', 'Web Browser controller system online.');
  }

  public static getInstance(): BrowserController {
    if (!BrowserController.instance) {
      BrowserController.instance = new BrowserController();
    }
    return BrowserController.instance;
  }

  public async launch(headed: boolean = false): Promise<string> {
    this.logger.info('BrowserController', `Spawning web agent context (headed=${headed})...`);
    await new Promise(resolve => setTimeout(resolve, 800));
    this.isBrowserOpen = true;
    this.currentUrl = 'https://www.google.com';
    this.logger.info('BrowserController', 'Web browser session spawned successfully.');
    return 'browser_session_ok';
  }

  public async navigate(url: string): Promise<string> {
    if (!this.isBrowserOpen) {
      await this.launch();
    }
    this.logger.info('BrowserController', `Navigating active tab context to: "${url}"`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.currentUrl = url;
    this.logger.info('BrowserController', `Successfully loaded: ${url}`);
    return `loaded_url_ok: ${url}`;
  }

  public async capturePageScreenshot(): Promise<string> {
    this.logger.info('BrowserController', `Taking screenshot of current view: ${this.currentUrl}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    this.logger.info('BrowserController', 'Screenshot captured and buffered.');
    return 'mock_screenshot_base64_data';
  }

  public async close(): Promise<void> {
    if (this.isBrowserOpen) {
      this.logger.info('BrowserController', 'Tearing down active browser session...');
      await new Promise(resolve => setTimeout(resolve, 300));
      this.isBrowserOpen = false;
      this.currentUrl = 'about:blank';
      this.logger.info('BrowserController', 'Browser session closed.');
    }
  }

  public cleanup(): void {
    if (this.isBrowserOpen) {
      this.isBrowserOpen = false;
      this.logger.info('BrowserController', 'Forced cleanup: Browser sessions terminated.');
    }
  }

  public getSessionStatus(): { isOpen: boolean; url: string } {
    return { isOpen: this.isBrowserOpen, url: this.currentUrl };
  }
}
