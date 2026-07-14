import { LogService } from '../services/LogService.js';

export interface TerminalSession {
  sessionId: string;
  command: string;
  status: 'running' | 'completed' | 'failed';
  output: string;
}

export class TerminalController {
  private static instance: TerminalController | null = null;
  private logger = LogService.getInstance();
  private activeSessions = new Map<string, TerminalSession>();

  private constructor() {
    this.logger.info('TerminalController', 'Terminal integration layer initialized.');
  }

  public static getInstance(): TerminalController {
    if (!TerminalController.instance) {
      TerminalController.instance = new TerminalController();
    }
    return TerminalController.instance;
  }

  public async executeCommand(command: string): Promise<TerminalSession> {
    this.logger.info('TerminalController', `Spawning secure shell task: "${command}"`);
    
    const sessionId = `term_${Math.random().toString(36).substr(2, 9)}`;
    const session: TerminalSession = {
      sessionId,
      command,
      status: 'running',
      output: `Windows PowerShell\nCopyright (C) Microsoft Corporation. All rights reserved.\n\nPS C:\\Users\\sayuj peter Sajan\\OneDrive\\Desktop\\AI Agent> ${command}\n`
    };

    this.activeSessions.set(sessionId, session);

    // Simulate stdout/stderr streaming
    await new Promise(resolve => setTimeout(resolve, 800));

    session.status = 'completed';
    session.output += `[Astra Terminal Server]: Running mock task for "${command}"...\n\nProcess completed with Exit Code 0.`;
    this.logger.info('TerminalController', `Shell command execution completed (Session: ${sessionId}).`);
    
    return { ...session };
  }

  public getActiveSessions(): TerminalSession[] {
    return Array.from(this.activeSessions.values());
  }

  public cleanup(): void {
    if (this.activeSessions.size > 0) {
      this.logger.info('TerminalController', `Aborting ${this.activeSessions.size} running terminal tasks.`);
      this.activeSessions.clear();
    }
  }
}
