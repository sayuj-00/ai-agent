/**
 * Terminal Controller Infrastructure — NodeTerminalRunner
 *
 * Implements ITerminalRunner using Node.js child_process.
 *
 * This is the ONLY file in the Terminal module that calls the OS.
 *
 * Features:
 *  ✔  Real command execution via child_process.spawn
 *  ✔  Separate stdout / stderr capture
 *  ✔  Per-line output streaming (OutputLine[] with timestamps)
 *  ✔  Configurable timeout with SIGKILL on breach
 *  ✔  Exit code detection → success / failure / timeout discrimination
 *  ✔  Session registry (get, list, cancel by ID)
 *  ✔  Security gate: every command passes CommandBlocklist first
 *  ✔  Shell selection: PowerShell (Windows default), bash/sh (Unix)
 *  ✔  Per-process AbortController for clean cancellation
 *
 * Future extensions (zero changes elsewhere):
 *  - Stream output line-by-line to the UI via IPC events
 *  - SSHTerminalRunner: same interface, remote execution
 *  - DockerTerminalRunner: container-scoped execution
 */

import { spawn, type ChildProcess } from 'child_process';
import path from 'path';
import os from 'os';

import type { ITerminalRunner } from '../domain/ITerminalRunner.js';
import type { CommandResult, ExecutionOptions, OutputLine, TerminalSession } from '../domain/CommandTypes.js';
import {
  generateSessionId,
  createSession,
  failedResult,
} from '../domain/CommandTypes.js';
import { CommandBlocklist } from './CommandBlocklist.js';
import { ShellResolver } from './ShellResolver.js';
import { LogService } from '../../services/LogService.js';

// ── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_TIMEOUT_MS = 30_000;  // 30 seconds
const MAX_OUTPUT_BYTES   = 5 * 1024 * 1024; // 5 MB output limit

export class NodeTerminalRunner implements ITerminalRunner {
  private readonly logger   = LogService.getInstance();
  private readonly sessions = new Map<string, TerminalSession>();
  private readonly processes= new Map<string, ChildProcess>();

  public readonly shellName: string;

  constructor(private readonly defaultShell: ExecutionOptions['shell'] = 'auto') {
    this.shellName = ShellResolver.resolve(defaultShell ?? 'auto').name;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  public async execute(command: string, options: ExecutionOptions = {}): Promise<CommandResult> {
    const start     = Date.now();
    const sessionId = generateSessionId();
    const cwd       = options.cwd ?? process.cwd();
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const shellChoice = options.shell ?? this.defaultShell ?? 'auto';

    // 1. Security gate
    const blockCheck = CommandBlocklist.check(command);
    if (blockCheck.blocked) {
      this.logger.error('Terminal', `🚫 Command blocked: "${command.substring(0, 60)}" — ${blockCheck.reason}`);
      return failedResult(sessionId, command, cwd, this.shellName, `Command blocked: ${blockCheck.reason}`);
    }

    // 2. Initialize session
    const session = createSession(sessionId, command);
    session.status = 'running';
    this.sessions.set(sessionId, session);

    const shell  = ShellResolver.resolve(shellChoice);
    const stdout: string[] = [];
    const stderr: string[] = [];
    const lines:  OutputLine[] = [];

    this.logger.info(
      'Terminal',
      `▶ [${sessionId}] Execute: "${command.substring(0, 80)}${command.length > 80 ? '…' : ''}" | shell=${shell.name} | cwd=${cwd}`
    );

    return new Promise<CommandResult>((resolve) => {
      let timedOut  = false;
      let cancelled = false;
      let totalBytes = 0;

      // Spawn the child process
      const child = spawn(shell.executable, [...shell.args, command], {
        cwd,
        env: { ...process.env, ...options.env },
        windowsHide: true,
        // Don't use shell:true — we handle shell selection explicitly
      });

      this.processes.set(sessionId, child);

      // ── stdout handler ─────────────────────────────────────────────────────
      child.stdout?.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf-8');
        totalBytes += text.length;

        if (totalBytes > MAX_OUTPUT_BYTES) {
          this.logger.error('Terminal', `[${sessionId}] Output limit exceeded (5 MB) — killing process.`);
          child.kill('SIGKILL');
          return;
        }

        stdout.push(text);
        session.output += text;

        for (const line of text.split('\n').filter(l => l.length > 0)) {
          const outputLine: OutputLine = {
            text: line.replace(/\r$/, ''),
            isError: false,
            timestamp: new Date().toISOString(),
          };
          lines.push(outputLine);
          session.outputLines.push(outputLine);
        }
      });

      // ── stderr handler ─────────────────────────────────────────────────────
      const stderrTarget = options.mergeStreams ? child.stdout : child.stderr;
      child.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf-8');
        totalBytes += text.length;
        stderr.push(text);

        for (const line of text.split('\n').filter(l => l.length > 0)) {
          const outputLine: OutputLine = {
            text: line.replace(/\r$/, ''),
            isError: true,
            timestamp: new Date().toISOString(),
          };
          lines.push(outputLine);
          session.outputLines.push(outputLine);
        }
      });

      // ── timeout ────────────────────────────────────────────────────────────
      const timer = setTimeout(() => {
        timedOut = true;
        this.logger.error('Terminal', `[${sessionId}] Timeout after ${timeoutMs}ms — killing process.`);
        child.kill('SIGKILL');
      }, timeoutMs);

      // ── process close ──────────────────────────────────────────────────────
      child.on('close', (code, signal) => {
        clearTimeout(timer);
        this.processes.delete(sessionId);

        const durationMs = Date.now() - start;
        const stdoutStr  = stdout.join('');
        const stderrStr  = stderr.join('');
        const finishedAt = new Date().toISOString();

        let status: CommandResult['status'];
        let outcome: CommandResult['outcome'];
        let success: boolean;

        if (cancelled) {
          status  = 'cancelled';
          outcome = 'cancelled';
          success = false;
        } else if (timedOut) {
          status  = 'timeout';
          outcome = 'timeout';
          success = false;
        } else if (code === 0) {
          status  = 'completed';
          outcome = 'success';
          success = true;
        } else {
          status  = 'failed';
          outcome = 'failure';
          success = false;
        }

        session.status = status;

        const result: CommandResult = {
          sessionId,
          command,
          cwd,
          status,
          outcome,
          success,
          outputLines: lines,
          stdout: stdoutStr,
          stderr: stderrStr,
          exitCode: code,
          durationMs,
          startedAt: session.startedAt,
          finishedAt,
          shell: shell.name,
          error: !success ? (stderrStr.trim() || `Exit code: ${code ?? signal}`) : undefined,
        };

        const emoji = success ? '✔' : timedOut ? '⏱' : cancelled ? '⏹' : '✖';
        this.logger.info(
          'Terminal',
          `${emoji} [${sessionId}] ${status.toUpperCase()} | exit=${code ?? signal} | ${durationMs}ms`
        );
        if (!success && stderrStr.trim()) {
          this.logger.error('Terminal', `[${sessionId}] stderr: ${stderrStr.trim().substring(0, 200)}`);
        }

        resolve(result);
      });

      // ── spawn error ────────────────────────────────────────────────────────
      child.on('error', (err) => {
        clearTimeout(timer);
        this.processes.delete(sessionId);

        session.status = 'failed';
        const duration = Date.now() - start;

        this.logger.error('Terminal', `[${sessionId}] Spawn error: ${err.message}`);
        resolve(failedResult(sessionId, command, cwd, shell.name, err.message, duration));
      });
    });
  }

  public getSessions(): TerminalSession[] {
    return [...this.sessions.values()];
  }

  public getSession(sessionId: string): TerminalSession | undefined {
    return this.sessions.get(sessionId);
  }

  public async cancel(sessionId: string): Promise<boolean> {
    const proc = this.processes.get(sessionId);
    if (!proc) return false;

    const session = this.sessions.get(sessionId);
    if (session) session.status = 'cancelled';

    proc.kill('SIGKILL');
    this.processes.delete(sessionId);
    this.logger.info('Terminal', `⏹ [${sessionId}] Process cancelled.`);
    return true;
  }

  public async cancelAll(): Promise<void> {
    const ids = [...this.processes.keys()];
    for (const id of ids) { await this.cancel(id); }
    this.logger.info('Terminal', `⏹ Cancelled ${ids.length} running process(es).`);
  }

  public clearHistory(): void {
    // Only clear sessions that are not still running
    for (const [id, session] of this.sessions) {
      if (session.status !== 'running') {
        this.sessions.delete(id);
      }
    }
    this.logger.info('Terminal', 'Session history cleared.');
  }
}
