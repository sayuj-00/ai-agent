/**
 * Vision Module Domain — IVisionDriver (Outbound Port)
 *
 * Driver interface defining how the system captures and analyzes screen details.
 * Decouples the application orchestration from native screen/camera APIs.
 */

import type { ScreenshotData, VisionAnalysisResult, VisionElement } from './VisionTypes.js';

export interface IVisionDriver {
  /**
   * Capture a screenshot of the main screen and save it to disk.
   * @param destinationDir - Path to directory where the image should be saved.
   */
  captureScreen(destinationDir: string): Promise<ScreenshotData>;

  /**
   * Perform full analysis on a screenshot (object detection + OCR).
   */
  analyze(screenshotPath: string): Promise<VisionAnalysisResult>;

  /**
   * Scan screenshot specifically to detect active GUI windows.
   */
  detectWindows(screenshotPath: string): Promise<VisionElement[]>;

  /**
   * Scan screenshot to locate clickable buttons.
   */
  detectButtons(screenshotPath: string): Promise<VisionElement[]>;

  /**
   * Run optical character recognition (OCR) to extract text.
   */
  ocr(screenshotPath: string): Promise<string>;
}
