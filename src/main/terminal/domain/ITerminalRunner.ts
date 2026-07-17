/**
 * Terminal Controller Domain — ITerminalRunner (Input Port)
 *
 * The interface the application layer uses to execute commands.
 * ONLY the application layer imports this — never the concrete runner.
 *
 * Implementations:
 *  - NodeTerminalRunner (infrastructure) — real child_process execution
 *  - MockTerminalRunner (testing)        — deterministic fake outputs
 *
 * Future:
 *  - SSHTerminalRunner  — run commands on remote machines
 *  - DockerTerminalRunner — run commands inside containers
 */

import type { CommandResult, ExecutionOptions, TerminalSession } from './CommandTypes.js';

export interface ITerminalRunner {
  /**
   * Execute a command and wait for it to finish.
   * Returns a fully-populated CommandResult.
   */
  execute(command: string, options?: ExecutionOptions): Promise<CommandResult>;

  /**
   * Get all sessions tracked in the current lifetime of this runner.
   * Includes completed, failed, and running sessions.
   */
  getSessions(): TerminalSession[];

  /**
   * Get a specific session by ID.
   * Returns undefined if the session does not exist.
   */
  getSession(sessionId: string): TerminalSession | undefined;

  /**
   * Cancel a running command by session ID.
   * Returns true if the process was found and killed, false otherwise.
   */
  cancel(sessionId: string): Promise<boolean>;

  /**
   * Cancel all currently-running commands.
   */
  cancelAll(): Promise<void>;

  /**
   * Remove all completed/failed sessions from memory.
   */
  clearHistory(): void;

  /**
   * The name of the shell this runner uses (e.g. 'powershell', 'bash').
   */
  readonly shellName: string;
}
