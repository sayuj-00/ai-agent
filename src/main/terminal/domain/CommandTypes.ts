/**
 * Terminal Controller Domain — CommandTypes
 *
 * Core data models for the Terminal Controller module.
 * Pure types — ZERO imports, zero runtime dependencies.
 *
 * Every other layer in this module depends on these types.
 */

// ---------------------------------------------------------------------------
// Status & exit code types
// ---------------------------------------------------------------------------

/** Lifecycle state of a terminal command */
export type CommandStatus =
  | 'pending'    // Created, not yet started
  | 'running'    // Actively executing
  | 'completed'  // Finished with exit code 0 (success)
  | 'failed'     // Finished with non-zero exit code
  | 'timeout'    // Killed because it exceeded the time limit
  | 'cancelled'; // Killed by explicit user/system request

/** Categories of terminal exit conditions */
export type ExecutionOutcome = 'success' | 'failure' | 'timeout' | 'cancelled';

// ---------------------------------------------------------------------------
// Core models
// ---------------------------------------------------------------------------

/** A single output line captured from stdout or stderr */
export interface OutputLine {
  /** The text content of the line */
  text: string;

  /** Whether this came from stderr (true) or stdout (false) */
  isError: boolean;

  /** ISO 8601 timestamp when the line was emitted */
  timestamp: string;
}

/** A structured, typed response for a terminal command execution */
export interface CommandResult {
  /** Session ID that uniquely identifies this command run */
  sessionId: string;

  /** The command string that was executed */
  command: string;

  /** The working directory where the command ran */
  cwd: string;

  /** Current lifecycle status */
  status: CommandStatus;

  /** High-level outcome — only set when status is terminal */
  outcome: ExecutionOutcome;

  /** Whether the command succeeded (exit code 0 and no fatal errors) */
  success: boolean;

  /** All captured output lines (stdout + stderr interleaved in order) */
  outputLines: OutputLine[];

  /** The full stdout as a single string */
  stdout: string;

  /** The full stderr as a single string */
  stderr: string;

  /** The process exit code (null if still running or killed without code) */
  exitCode: number | null;

  /** Total wall-clock execution time in milliseconds */
  durationMs: number;

  /** ISO 8601 timestamp when command started */
  startedAt: string;

  /** ISO 8601 timestamp when command finished (undefined if still running) */
  finishedAt?: string;

  /** Error message if execution itself failed (e.g., command not found) */
  error?: string;

  /** The operating system shell used */
  shell: string;
}

/** A live terminal session that tracks a running process */
export interface TerminalSession {
  /** Unique session identifier */
  sessionId: string;

  /** The command being executed */
  command: string;

  /** Current status */
  status: CommandStatus;

  /** Output accumulated so far (for streaming) */
  output: string;

  /** All structured output lines */
  outputLines: OutputLine[];

  /** Time execution started */
  startedAt: string;
}

// ---------------------------------------------------------------------------
// Configuration types
// ---------------------------------------------------------------------------

/** Options for a single command execution */
export interface ExecutionOptions {
  /**
   * Working directory for the command.
   * Defaults to the current process cwd.
   */
  cwd?: string;

  /**
   * Maximum time in milliseconds to wait before force-killing.
   * Default: 30 000 ms (30 seconds).
   */
  timeoutMs?: number;

  /**
   * Environment variable overrides.
   * Merged on top of the process environment.
   */
  env?: Record<string, string>;

  /**
   * Shell to use: 'powershell' | 'cmd' | 'bash' | 'sh' | 'auto'
   * 'auto' selects PowerShell on Windows, bash/sh on Linux/macOS.
   */
  shell?: 'powershell' | 'cmd' | 'bash' | 'sh' | 'auto';

  /**
   * If true, merges stderr into stdout stream (like 2>&1).
   * Default: false (stderr and stdout tracked separately).
   */
  mergeStreams?: boolean;
}

// ---------------------------------------------------------------------------
// Blocklist types (for security)
// ---------------------------------------------------------------------------

/** A blocked command rule */
export interface BlockedCommandRule {
  pattern: RegExp;
  reason: string;
}

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

/** Generate a new session ID */
export function generateSessionId(): string {
  return `term_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Create a fresh TerminalSession */
export function createSession(sessionId: string, command: string): TerminalSession {
  return {
    sessionId,
    command,
    status: 'pending',
    output: '',
    outputLines: [],
    startedAt: new Date().toISOString(),
  };
}

/** Build a failed CommandResult (for errors before execution starts) */
export function failedResult(
  sessionId: string,
  command: string,
  cwd: string,
  shell: string,
  error: string,
  durationMs = 0
): CommandResult {
  const now = new Date().toISOString();
  return {
    sessionId, command, cwd, shell,
    status: 'failed',
    outcome: 'failure',
    success: false,
    outputLines: [],
    stdout: '',
    stderr: error,
    exitCode: -1,
    durationMs,
    startedAt: now,
    finishedAt: now,
    error,
  };
}
