/**
 * Vision Module — VisionModuleService (Public Facade)
 *
 * The single public gateway for screen capture and image/screen analysis.
 * Automatically handles dependency injection.
 *
 * Future expansions:
 *  - Swap ElectronVisionDriver for Tesseract/OpenCV/TensorFlow backend
 *  - Zero changes to VisionUseCase or VisionModuleService
 */

import { LogService } from '../services/LogService.js';
import { ElectronVisionDriver } from './infrastructure/ElectronVisionDriver.js';
import { VisionUseCase } from './application/VisionUseCase.js';

export type { ScreenshotData, VisionAnalysisResult, VisionElement, Bounds, ElementType } from './domain/VisionTypes.js';
export type { IVisionDriver } from './domain/IVisionDriver.js';

export class VisionModuleService {
  private static instance: VisionModuleService | null = null;
  private readonly useCase: VisionUseCase;
  private readonly logger = LogService.getInstance();

  private constructor() {
    const driver = new ElectronVisionDriver();
    this.useCase = new VisionUseCase(driver);
    this.logger.info('Vision', 'Vision Module online (Clean Architecture).');
  }

  public static getInstance(): VisionModuleService {
    if (!VisionModuleService.instance) {
      VisionModuleService.instance = new VisionModuleService();
    }
    return VisionModuleService.instance;
  }

  /**
   * Take a real screenshot of the primary display.
   */
  public async captureScreen() {
    return this.useCase.captureScreen();
  }

  /**
   * Analyze elements and OCR text on a saved screenshot.
   */
  public async analyzeImage(screenshotPath: string) {
    return this.useCase.analyzeImage(screenshotPath);
  }

  /**
   * Capture the screen right now and perform full layout analysis.
   */
  public async analyzeCurrentScreen() {
    return this.useCase.analyzeCurrentScreen();
  }

  /**
   * Run optical character recognition (OCR) on an image path.
   */
  public async ocr(screenshotPath: string) {
    return this.useCase.ocr(screenshotPath);
  }
}
