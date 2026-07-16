/**
 * controllers/ApplicationController.ts — Compatibility Shim
 *
 * Exposes AppControllerService as ApplicationController.
 * This aligns with the BrowserController and FileManager architectural patterns.
 */

export { AppControllerService as ApplicationController } from '../appcontroller/AppControllerService.js';
export type {
  AppInfo,
  AppControlResult,
  IAppDriver
} from '../appcontroller/AppControllerService.js';
