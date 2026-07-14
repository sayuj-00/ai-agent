export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  module: string;
  message: string;
}

export class LogService {
  private static instance: LogService | null = null;
  private logs: LogEntry[] = [];
  private listeners: ((log: LogEntry) => void)[] = [];

  private constructor() {
    this.info('LogService', 'Logging service initialized.');
  }

  public static getInstance(): LogService {
    if (!LogService.instance) {
      LogService.instance = new LogService();
    }
    return LogService.instance;
  }

  public info(module: string, message: string): void {
    this.log('info', module, message);
  }

  public warn(module: string, message: string): void {
    this.log('warn', module, message);
  }

  public error(module: string, message: string): void {
    this.log('error', module, message);
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public addLogListener(listener: (log: LogEntry) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private log(level: 'info' | 'warn' | 'error', module: string, message: string): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message
    };
    this.logs.push(entry);
    
    // Print to developer console
    const formatted = `[${entry.timestamp}] [${level.toUpperCase()}] [${module}] ${message}`;
    if (level === 'error') {
      console.error(formatted);
    } else if (level === 'warn') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }

    // Notify IPC and UI listeners
    this.listeners.forEach(listener => {
      try {
        listener(entry);
      } catch (err) {
        console.error('Failed to notify log listener', err);
      }
    });
  }
}
