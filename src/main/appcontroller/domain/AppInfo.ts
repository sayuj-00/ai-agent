/**
 * Application Controller Domain — AppInfo
 *
 * Core data models for the Application Controller module.
 * Pure types — ZERO imports.
 *
 * Rules:
 *  - No external library, services, or Electron dependencies.
 *  - Serves as the stable contract for layers below it.
 */

export interface AppInfo {
  /** Unique ID (e.g. PID or path-based identifier) */
  id: string;

  /** Display name of the application (e.g., "Notepad") */
  name: string;

  /** Absolute path to the executable file */
  path?: string;

  /** Process ID if the application is currently running */
  pid?: number;

  /** State indicator representing if the app is active and running */
  isRunning: boolean;

  /** Window title string if retrievable and the app is running */
  windowTitle?: string;
}

export interface AppControlResult {
  /** Indicates whether the requested operation succeeded */
  success: boolean;

  /** Human-readable status message of the outcome */
  message: string;

  /** Error details if success is false */
  error?: string;

  /** Total execution duration in milliseconds */
  durationMs: number;
}

/** Factory helper to build a default failed result */
export function failAppResult(error: string, durationMs = 0): AppControlResult {
  return { success: false, message: error, error, durationMs };
}

/** Factory helper to build a default successful result */
export function successAppResult(message: string, durationMs: number): AppControlResult {
  return { success: true, message, durationMs };
}
