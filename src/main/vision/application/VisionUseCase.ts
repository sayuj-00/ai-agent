/**
 * Vision Module Application Layer — VisionUseCase
 *
 * Orchestrates all screen capture and visual analysis operations.
 *
 * Rules (Clean Architecture):
 *  - Depends only on IVisionDriver and domain types.
 *  - Adds structured logging around each step.
 *  - Resolves path directories for temporary screenshot storage.
 */

import path from 'path';
import os from 'os';
import type { IVisionDriver } from '../domain/IVisionDriver.js';
import type { ScreenshotData, VisionAnalysisResult, VisionElement } from '../domain/VisionTypes.js';
import { LogService } from '../../services/LogService.js';

export class VisionUseCase {
  private readonly logger = LogService.getInstance();
  private readonly tempDir = path.join(os.tmpdir(), 'astra-vision');

  constructor(private readonly driver: IVisionDriver) {}

  /**
   * Capture a screenshot of the main screen.
   */
  public async captureScreen(): Promise<ScreenshotData> {
    this.logger.info('Vision', '📸 Capture screen request received.');
    const result = await this.driver.captureScreen(this.tempDir);
    this.logger.info('Vision', `✔ Screen captured: ${result.filePath}`);
    return result;
  }

  /**
   * Perform layout analysis on a screenshot.
   */
  public async analyzeImage(screenshotPath: string): Promise<VisionAnalysisResult> {
    this.logger.info('Vision', `🔍 Image analysis requested for: "${screenshotPath}"`);
    const result = await this.driver.analyze(screenshotPath);
    this.logger.info('Vision', `✔ Analysis completed: detected ${result.elements.length} elements.`);
    return result;
  }

  /**
   * Run screenshot capture AND return full visual analysis in one step.
   */
  public async analyzeCurrentScreen(): Promise<VisionAnalysisResult> {
    this.logger.info('Vision', '📸🔍 Capturing and analyzing current screen state…');
    const screenshot = await this.captureScreen();
    return this.analyzeImage(screenshot.filePath);
  }

  /**
   * Run OCR on a specific image.
   */
  public async ocr(screenshotPath: string): Promise<string> {
    this.logger.info('Vision', `📝 OCR extraction requested for: "${screenshotPath}"`);
    const text = await this.driver.ocr(screenshotPath);
    this.logger.info('Vision', `✔ OCR finished: read ${text.length} characters.`);
    return text;
  }
}
