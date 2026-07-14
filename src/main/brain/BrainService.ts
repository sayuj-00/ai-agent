/**
 * Brain Module — BrainService (Public Facade)
 *
 * This is the single public entry point for the entire Brain module.
 * It wires the dependency graph and exposes a minimal surface area.
 *
 * Dependency graph (assembled here, not imported directly by consumers):
 *
 *   BrainService
 *     └── BrainUseCase           (application layer)
 *           ├── IntentParser     (infrastructure — pure computation)
 *           └── PlannerAdapter   (infrastructure — IBrainPort impl)
 *
 * Callers (IPC handlers, tests) only import BrainService.
 * They never need to know about use cases, parsers, or adapters.
 */

import { LogService } from '../services/LogService.js';
import { IntentParser } from './infrastructure/IntentParser.js';
import { BrainUseCase } from './application/BrainUseCase.js';
import { PlannerAdapter } from './PlannerAdapter.js';
import type { Intent } from './domain/Intent.js';

// Re-export domain types so callers can use them without digging into subdirs
export type { Intent, IntentAction, ConfidenceTier } from './domain/Intent.js';
export type { IBrainPort } from './domain/IBrainPort.js';

export class BrainService {
  private static instance: BrainService | null = null;
  private readonly useCase: BrainUseCase;
  private readonly logger = LogService.getInstance();

  private constructor() {
    // Assemble the dependency graph
    const parser  = new IntentParser();
    const port    = new PlannerAdapter();
    this.useCase  = new BrainUseCase(parser, port);

    this.logger.info('Brain', 'Brain module initialized (clean architecture).');
    this.logger.info('Brain', 'Pipeline: IntentParser → BrainUseCase → PlannerAdapter → PlannerService');
  }

  public static getInstance(): BrainService {
    if (!BrainService.instance) {
      BrainService.instance = new BrainService();
    }
    return BrainService.instance;
  }

  // ---------------------------------------------------------------------------
  // Primary API
  // ---------------------------------------------------------------------------

  /**
   * Processes a natural language input string.
   *
   * Returns a structured Intent — the Brain's complete understanding of the
   * request. The intent has already been dispatched to the Planner by the time
   * this resolves (for plannable actions).
   *
   * The Brain does NOT execute anything — it only classifies and delegates.
   *
   * @param input - Raw user text.
   * @returns The classified Intent.
   */
  public async process(input: string): Promise<Intent> {
    this.logger.info('Brain', `▶ Input received: "${input.substring(0, 80)}${input.length > 80 ? '…' : ''}"`);

    const intent = await this.useCase.process(input);

    this.logger.info(
      'Brain',
      `✔ Intent resolved — action="${intent.action}" | ` +
      `confidence=${(intent.confidence * 100).toFixed(0)}% (${intent.confidenceTier}) | ` +
      `id=${intent.id}`
    );

    return intent;
  }

  // ---------------------------------------------------------------------------
  // Legacy compatibility (kept for ChatPanel's queryBrain IPC call)
  // ---------------------------------------------------------------------------

  /**
   * @deprecated Use process() instead for structured output.
   *
   * Wraps process() and returns a text-friendly summary for the chat UI.
   * This keeps the existing brain:query IPC channel functional while the
   * UI is updated to use the new brain:process channel.
   */
  public async query(prompt: string, _context?: unknown): Promise<{
    content: string;
    tokensUsed: number;
    model: string;
  }> {
    const intent = await this.process(prompt);

    const paramSummary = Object.entries(intent.parameters)
      .filter(([k]) => k !== 'input')
      .map(([k, v]) => `${k}: "${v}"`)
      .join(', ');

    const content = [
      `🧠 **Brain** classified your request as \`${intent.action}\``,
      `📊 Confidence: ${(intent.confidence * 100).toFixed(0)}% (${intent.confidenceTier})`,
      paramSummary ? `🔍 Extracted: ${paramSummary}` : null,
      `📋 Intent dispatched to Planner (ID: \`${intent.id}\`)`,
    ].filter(Boolean).join('\n');

    return {
      content,
      tokensUsed: 0,
      model: 'brain/intent-parser-v1'
    };
  }
}
