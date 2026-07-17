/**
 * services/VisionService.ts — Compatibility Shim
 *
 * The Vision Controller has been refactored into a clean architecture module at:
 *   src/main/vision/
 *
 * This file re-exports VisionModuleService as VisionService so all
 * existing import paths (ipcHandlers, AppController, etc.) continue to
 * work without modification.
 *
 * DO NOT add new logic here — use src/main/vision/VisionModuleService.ts.
 */

export { VisionModuleService as VisionService } from '../vision/VisionModuleService.js';
export type {
  ScreenshotData,
  VisionAnalysisResult,
  VisionElement,
  Bounds,
  ElementType,
  IVisionDriver
} from '../vision/VisionModuleService.js';
