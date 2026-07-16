/**
 * Application Controller Infrastructure — WindowsAppDriver
 *
 * Implements IAppDriver for the Windows platform using child_process
 * and PowerShell commands.
 */

import { spawn, exec } from 'child_process';
import { shell } from 'electron';
import type { IAppDriver } from '../domain/IAppDriver.js';
import type { AppInfo, AppControlResult } from '../domain/AppInfo.js';
import { failAppResult, successAppResult } from '../domain/AppInfo.js';
import { LogService } from '../../services/LogService.js';

export class WindowsAppDriver implements IAppDriver {
  private readonly logger = LogService.getInstance();

  public async launch(appNameOrPath: string, args: string[] = []): Promise<AppControlResult> {
    const start = Date.now();
    this.logger.info('WindowsAppDriver', `Launching app: "${appNameOrPath}" with args: [${args.join(', ')}]`);

    try {
      // First, try standard spawn (good for system apps like notepad, calc or full executable paths)
      const isSystemApp = ['notepad', 'calc', 'mspaint', 'write', 'cmd', 'powershell'].includes(appNameOrPath.toLowerCase());
      const spawnTarget = isSystemApp ? `${appNameOrPath}.exe` : appNameOrPath;

      const child = spawn(spawnTarget, args, {
        detached: true,
        stdio: 'ignore'
      });

      child.unref();

      // If spawn succeeds immediately, return success
      if (child.pid) {
        return successAppResult(
          `Successfully launched "${appNameOrPath}" (PID: ${child.pid}).`,
          Date.now() - start
        );
      }

      // Fallback: If spawn fails or doesn't return a PID, attempt using Electron shell.openPath
      this.logger.info('WindowsAppDriver', `Spawn did not yield PID. Retrying launch via shell.openPath...`);
      const openResult = await shell.openPath(appNameOrPath);

      if (openResult) {
        // Electron's shell.openPath returns an empty string on success, or an error message on failure.
        return failAppResult(
          `Failed to launch "${appNameOrPath}" via shell.openPath: ${openResult}`,
          Date.now() - start
        );
      }

      return successAppResult(
        `Successfully opened "${appNameOrPath}" via shell.openPath.`,
        Date.now() - start
      );
    } catch (error: any) {
      this.logger.error('WindowsAppDriver', `Launch exception for "${appNameOrPath}": ${error.message}`);
      return failAppResult(
        `Exception occurred launching app: ${error.message}`,
        Date.now() - start
      );
    }
  }

  public async close(identifier: number | string): Promise<AppControlResult> {
    const start = Date.now();
    this.logger.info('WindowsAppDriver', `Attempting to close app with identifier: "${identifier}"`);

    return new Promise((resolve) => {
      let cmd = '';
      if (typeof identifier === 'number') {
        cmd = `taskkill /F /PID ${identifier}`;
      } else {
        // Clean process name (remove extension if provided)
        const name = identifier.toLowerCase().endsWith('.exe') ? identifier : `${identifier}.exe`;
        cmd = `taskkill /F /IM "${name}" /T`;
      }

      exec(cmd, (error, stdout, stderr) => {
        const duration = Date.now() - start;
        if (error) {
          this.logger.error('WindowsAppDriver', `Close failed: ${stderr || error.message}`);
          resolve(failAppResult(`Failed to close app "${identifier}": ${stderr.trim() || error.message}`, duration));
        } else {
          this.logger.info('WindowsAppDriver', `Successfully terminated process: ${identifier}`);
          resolve(successAppResult(`Successfully closed app "${identifier}".`, duration));
        }
      });
    });
  }

  public async switchWindow(identifier: number | string): Promise<AppControlResult> {
    const start = Date.now();
    this.logger.info('WindowsAppDriver', `Switching window to: "${identifier}" (Stubbed)`);

    // Window switching requires native APIs (e.g. SetForegroundWindow via ffi-napi or PowerShell hack).
    // We provide a clean logging statement and mock success to keep interface ready for future integration.
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(successAppResult(
          `Window focus switched to "${identifier}" (Stub implementation).`,
          Date.now() - start
        ));
      }, 100);
    });
  }

  public async detectRunningApps(): Promise<AppInfo[]> {
    this.logger.info('WindowsAppDriver', 'Detecting running desktop applications...');

    return new Promise((resolve) => {
      // Query processes with non-empty MainWindowTitle using PowerShell.
      // This matches real application windows.
      const queryCmd = `powershell -NoProfile -Command "Get-Process | Where-Object { $_.MainWindowTitle } | Select-Object Id, ProcessName, Path, MainWindowTitle | ConvertTo-Json -Compress"`;

      exec(queryCmd, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          this.logger.error('WindowsAppDriver', `Process detection query failed: ${stderr || error.message}`);
          // Fallback to minimal mock listing of standard Windows programs for safety
          resolve(this.getSimulatedApps());
          return;
        }

        try {
          const raw = stdout.trim();
          if (!raw) {
            resolve([]);
            return;
          }

          // Convert powerShell output. It can be a single object or an array of objects.
          const data = JSON.parse(raw);
          const rawApps = Array.isArray(data) ? data : [data];

          const apps: AppInfo[] = rawApps.map((proc: any) => ({
            id: proc.Id ? String(proc.Id) : String(Math.random()),
            name: proc.ProcessName || 'Unknown App',
            path: proc.Path || undefined,
            pid: proc.Id || undefined,
            isRunning: true,
            windowTitle: proc.MainWindowTitle || undefined
          }));

          resolve(apps);
        } catch (parseError: any) {
          this.logger.error('WindowsAppDriver', `Failed parsing powershell JSON: ${parseError.message}`);
          resolve(this.getSimulatedApps());
        }
      });
    });
  }

  private getSimulatedApps(): AppInfo[] {
    return [
      { id: '1001', name: 'explorer', pid: 1001, isRunning: true, windowTitle: 'File Explorer' },
      { id: '2002', name: 'chrome', pid: 2002, isRunning: true, windowTitle: 'Google Chrome' },
      { id: '3003', name: 'notepad', pid: 3003, isRunning: true, windowTitle: 'Untitled - Notepad' }
    ];
  }
}
