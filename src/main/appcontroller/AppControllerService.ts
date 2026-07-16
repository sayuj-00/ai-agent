/**
 * Application Controller Module — AppControllerService (Public Facade)
 *
 * The single public gateway for launching, closing, switching, and detecting apps. Wires up
 * dependency injection automatically.
 */

import { LogService } from '../services/LogService.js';
import { WindowsAppDriver } from './infrastructure/WindowsAppDriver.js';
import { AppControlUseCase } from './application/AppControlUseCase.js';

export type { AppInfo, AppControlResult } from './domain/AppInfo.js';
export type { IAppDriver } from './domain/IAppDriver.js';

export class AppControllerService {
  private static instance: AppControllerService | null = null;
  private readonly useCase: AppControlUseCase;
  private readonly logger = LogService.getInstance();

  private constructor() {
    const driver = new WindowsAppDriver();
    this.useCase = new AppControlUseCase(driver);
    this.logger.info('AppController', 'Application Controller subsystem online (Clean Architecture).');
  }

  public static getInstance(): AppControllerService {
    if (!AppControllerService.instance) {
      AppControllerService.instance = new AppControllerService();
    }
    return AppControllerService.instance;
  }

  /**
   * Launch a desktop application by name or file path.
   */
  public async launch(appNameOrPath: string, args: string[] = []) {
    return this.useCase.launch(appNameOrPath, args);
  }

  /**
   * Terminate/close an application by PID (number) or process name (string).
   */
  public async close(identifier: number | string) {
    return this.useCase.close(identifier);
  }

  /**
   * Switch focus to an active application window.
   */
  public async switchWindow(identifier: number | string) {
    return this.useCase.switchWindow(identifier);
  }

  /**
   * Scan and list all running GUI applications.
   */
  public async detectRunningApps() {
    return this.useCase.detectRunningApps();
  }
}
