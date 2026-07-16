/**
 * Application Controller Application Layer — AppControlUseCase
 *
 * Orchestrated application actions (launching, closing, switching, detecting).
 *
 * Rules (Clean Architecture):
 *  - Only depends on IAppDriver interface and domain types.
 *  - Logs results to LogService.
 *  - Returns clean result models.
 */

import type { IAppDriver } from '../domain/IAppDriver.js';
import type { AppInfo, AppControlResult } from '../domain/AppInfo.js';
import { LogService } from '../../services/LogService.js';

export class AppControlUseCase {
  private readonly logger = LogService.getInstance();

  constructor(private readonly driver: IAppDriver) {}

  public async launch(appNameOrPath: string, args: string[] = []): Promise<AppControlResult> {
    this.logger.info('AppController', `🚀 App:Launch requested: "${appNameOrPath}"`);
    const result = await this.driver.launch(appNameOrPath, args);
    this.logResult('Launch', result);
    return result;
  }

  public async close(identifier: number | string): Promise<AppControlResult> {
    this.logger.info('AppController', `🛑 App:Close requested: "${identifier}"`);
    const result = await this.driver.close(identifier);
    this.logResult('Close', result);
    return result;
  }

  public async switchWindow(identifier: number | string): Promise<AppControlResult> {
    this.logger.info('AppController', `🔀 App:SwitchWindow requested: "${identifier}"`);
    const result = await this.driver.switchWindow(identifier);
    this.logResult('SwitchWindow', result);
    return result;
  }

  public async detectRunningApps(): Promise<AppInfo[]> {
    this.logger.info('AppController', '🔍 App:DetectRunning requested');
    const apps = await this.driver.detectRunningApps();
    this.logger.info('AppController', `🔍 App:DetectRunning found ${apps.length} active apps`);
    return apps;
  }

  private logResult(operation: string, result: AppControlResult): void {
    if (result.success) {
      this.logger.info('AppController', `✔ ${operation} successful: ${result.message} | ${result.durationMs}ms`);
    } else {
      this.logger.error('AppController', `✖ ${operation} failed: ${result.error}`);
    }
  }
}
