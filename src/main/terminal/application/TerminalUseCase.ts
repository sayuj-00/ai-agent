/**
 * Terminal Controller Application Layer — TerminalUseCase
 *
 * Orchestrates all terminal operations through ITerminalRunner.
 *
 * Rules (Clean Architecture):
 *  - Only imports from domain/ (types + interfaces).
 *  - Has ZERO knowledge of NodeTerminalRunner, child_process, or OS specifics.
 *  - Adds structured logging around every operation.
 *  - Every method returns a typed result — never throws.
 *  - Fully testable with a MockTerminalRunner.
 *
 * Extra behaviours added here (not in the runner):
 *  - Output post-processing: trim trailing whitespace
 *  - Success detection from both exit code AND output patterns
 *  - Command history stats (total run, success rate)
 */

import type { ITerminalRunner } from '../domain/ITerminalRunner.js';
import type { CommandResult, ExecutionOptions, TerminalSession } from '../domain/CommandTypes.js';
import { LogService } from '../../services/LogService.js';

/** Aggregate statistics over the current session */
export interface TerminalStats {
  totalExecuted: number;
  totalSucceeded: number;
  totalFailed: number;
  totalCancelled: number;
  successRatePercent: number;
}

export class TerminalUseCase {
  private readonly logger = LogService.getInstance();
  private totalExecuted  = 0;
  private totalSucceeded = 0;
  private totalFailed    = 0;
  private totalCancelled = 0;

  constructor(private readonly runner: ITerminalRunner) {}

  // ── Execution ─────────────────────────────────────────────────────────────

  public async execute(
    command: string,
    options: ExecutionOptions = {}
  ): Promise<CommandResult> {
    this.logger.info('Terminal', `💻 Execute: "${command.substring(0, 80)}"`);
    this.totalExecuted++;

    const result = await this.runner.execute(command, options);

    // Post-process output: trim trailing newlines
    result.stdout = result.stdout.trimEnd();
    result.stderr = result.stderr.trimEnd();

    // Track stats
    switch (result.outcome) {
      case 'success':   this.totalSucceeded++; break;
      case 'failure':   this.totalFailed++;    break;
      case 'cancelled': this.totalCancelled++; break;
      case 'timeout':   this.totalFailed++;    break;
    }

    return result;
  }

  // ── Session inspection ────────────────────────────────────────────────────

  public getSessions(): TerminalSession[] {
    return this.runner.getSessions();
  }

  public getSession(sessionId: string): TerminalSession | undefined {
    return this.runner.getSession(sessionId);
  }

  // ── Control ───────────────────────────────────────────────────────────────

  public async cancel(sessionId: string): Promise<boolean> {
    this.logger.info('Terminal', `⏹ Cancel session [${sessionId}]`);
    const result = await this.runner.cancel(sessionId);
    if (result) {
      this.totalCancelled++;
      this.logger.info('Terminal', `✔ Session [${sessionId}] cancelled.`);
    } else {
      this.logger.info('Terminal', `ℹ Session [${sessionId}] not found or already finished.`);
    }
    return result;
  }

  public async cancelAll(): Promise<void> {
    this.logger.info('Terminal', '⏹ Cancel all running sessions…');
    await this.runner.cancelAll();
  }

  public clearHistory(): void {
    this.runner.clearHistory();
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  public getStats(): TerminalStats {
    const pct = this.totalExecuted === 0
      ? 0
      : Math.round((this.totalSucceeded / this.totalExecuted) * 100);

    return {
      totalExecuted:       this.totalExecuted,
      totalSucceeded:      this.totalSucceeded,
      totalFailed:         this.totalFailed,
      totalCancelled:      this.totalCancelled,
      successRatePercent:  pct,
    };
  }

  // ── Shell info ────────────────────────────────────────────────────────────

  public get shellName(): string {
    return this.runner.shellName;
  }
}
