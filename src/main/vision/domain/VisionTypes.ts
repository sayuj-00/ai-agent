/**
 * Vision Module Domain — VisionTypes
 *
 * Core data models for the Vision module.
 * Pure types — ZERO imports.
 *
 * Exposes bounding boxes, OCR content, and object layouts for the Planner.
 */

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ElementType =
  | 'button'
  | 'input'
  | 'window'
  | 'text'
  | 'image'
  | 'link'
  | 'other';

export interface VisionElement {
  /** Label describing the type of detected interface element */
  label: ElementType;

  /** Text content read from inside or near the element (if any) */
  text?: string;

  /** Confidence value (0.0 to 1.0) of the detection/OCR */
  confidence: number;

  /** Relative or absolute bounding box coordinates on the screen */
  bounds: Bounds;
}

export interface ScreenshotData {
  /** Local absolute path where the captured screenshot is saved */
  filePath: string;

  /** Image width in pixels */
  width: number;

  /** Image height in pixels */
  height: number;

  /** ISO 8601 timestamp when the capture occurred */
  capturedAt: string;
}

export interface VisionAnalysisResult {
  /** Metadata of the screenshot used for analysis */
  screenshot: ScreenshotData;

  /** General natural language description of what is on screen */
  description: string;

  /** List of individual interactive and layout elements detected */
  elements: VisionElement[];

  /** Full OCR text read from the entire screenshot */
  ocrText: string;

  /** Time taken in milliseconds for the operation */
  durationMs: number;
}
