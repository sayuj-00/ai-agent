/**
 * Application Controller Domain — IAppDriver
 *
 * Interface representing the outbound port for interacting with applications.
 * Clean architecture rule: The application logic only knows about this interface.
 */

import type { AppInfo, AppControlResult } from './AppInfo.js';

export interface IAppDriver {
  /**
   * Launch a desktop application.
   * @param appNameOrPath - Name of the application (e.g., "notepad") or path to the executable.
   * @param args - Array of command-line arguments to pass to the application.
   */
  launch(appNameOrPath: string, args?: string[]): Promise<AppControlResult>;

  /**
   * Close a running application.
   * @param identifier - Can be a process ID (PID) as a number or the process name as a string.
   */
  close(identifier: number | string): Promise<AppControlResult>;

  /**
   * Focus or bring a window of the application to the foreground.
   * @param identifier - Can be a PID (number) or the window title / process name (string).
   */
  switchWindow(identifier: number | string): Promise<AppControlResult>;

  /**
   * Detect and list running GUI processes with main window titles.
   */
  detectRunningApps(): Promise<AppInfo[]>;
}
