/**
 * Terminal Controller Module — TerminalControllerService (Public Facade)
 *
 * Single public entry point for the entire Terminal Controller module.
 * Wires the dependency graph and exposes a clean, minimal API.
 *
 * Dependency graph (assembled here):
 *
 *   TerminalControllerService
 *     └── TerminalUseCase                  (application layer)
 *           └── NodeTerminalRunner         (infrastructure — real child_process)
 *                 ├── CommandBlocklist     (security: 15 blocked patterns)
 *                 └── ShellResolver        (auto: PowerShell/bash/sh)
 *
 * Future expansions:
 *  - Swap NodeTerminalRunner for SSHTerminalRunner → remote execution
 *  - Swap for DockerTerminalRunner → containerised commands
 *  - Zero changes to TerminalUseCase or TerminalControllerService
 *
 * Callers (IPC handlers) import only TerminalControllerService.
 * All domain types are re-exported here for single-import convenience.
 */

import { LogService } from '../services/LogService.js';
import { NodeTerminalRunner } from './infrastructure/NodeTerminalRunner.js';
import { TerminalUseCase } from './application/TerminalUseCase.js';
import type { ExecutionOptions } from './domain/CommandTypes.js';

// Re-export all public types — callers need only import this file
export type {
  CommandResult,
  CommandStatus,
  ExecutionOutcome,
  ExecutionOptions,
  OutputLine,
  TerminalSession,
} from './domain/CommandTypes.js';
export type { ITerminalRunner } from './domain/ITerminalRunner.js';
export type { TerminalStats } from './application/TerminalUseCase.js';

export class TerminalControllerService {
  private static instance: TerminalControllerService | null = null;
  private readonly useCase: TerminalUseCase;
  private readonly logger = LogService.getInstance();

  private constructor() {
    const runner   = new NodeTerminalRunner('auto');
    this.useCase   = new TerminalUseCase(runner);

    this.logger.info('Terminal', 'Terminal Controller initialized (clean architecture).');
    this.logger.info('Terminal', `Shell: ${this.useCase.shellName} | Security: CommandBlocklist (15 rules) active.`);
  }

  public static getInstance(): TerminalControllerService {
    if (!TerminalControllerService.instance) {
      TerminalControllerService.instance = new TerminalControllerService();
    }
    return TerminalControllerService.instance;
  }

  // ── Execute ───────────────────────────────────────────────────────────────

  /**
   * Execute a terminal command and wait for the result.
   *
   * @param command    - The full command string (e.g. "git status", "npm install")
   * @param options    - Optional: cwd, timeout, env vars, shell choice
   * @returns          - Structured CommandResult with stdout, stderr, exit code, timing
   */
  public async execute(command: string, options: ExecutionOptions = {}) {
    return this.useCase.execute(command, options);
  }

  // ── Session inspection ────────────────────────────────────────────────────

  /** List all sessions (running, completed, failed) */
  public getSessions() {
    return this.useCase.getSessions();
  }

  /** Get a specific session by ID */
  public getSession(sessionId: string) {
    return this.useCase.getSession(sessionId);
  }

  // ── Cancellation ─────────────────────────────────────────────────────────

  /** Cancel a running command by session ID */
  public async cancel(sessionId: string) {
    return this.useCase.cancel(sessionId);
  }

  /** Cancel all currently-running commands */
  public async cancelAll() {
    return this.useCase.cancelAll();
  }

  /** Remove completed sessions from memory */
  public clearHistory() {
    this.useCase.clearHistory();
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  /** Get execution statistics for this session (success rate, counts) */
  public getStats() {
    return this.useCase.getStats();
  }

  // ── Info ──────────────────────────────────────────────────────────────────

  /** The name of the shell being used */
  public get shellName(): string {
    return this.useCase.shellName;
  }

  // ── Backward compatibility (controllers/TerminalController.ts legacy API) ──

  /**
   * @deprecated Use execute() instead for structured output.
   * Kept for backward compatibility with existing IPC channel.
   */
  public async executeCommand(command: string) {
    const result = await this.execute(command);
    // Return the legacy TerminalSession shape
    return {
      sessionId: result.sessionId,
      command:   result.command,
      status:    result.success ? 'completed' : 'failed',
      output:    result.stdout || result.stderr || result.error || '',
    };
  }

  /**
   * @deprecated Use getSessions() instead.
   */
  public getActiveSessions() {
    return this.getSessions();
  }

  /**
   * Called on app exit — cancels all running commands.
   */
  public cleanup(): void {
    this.cancelAll();
    this.logger.info('Terminal', 'Terminal Controller cleaned up — all processes cancelled.');
  }
}
