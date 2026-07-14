export class LogsPanel {
  private container: HTMLDivElement;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) as HTMLDivElement;
    this.render();
    this.attachEvents();
    this.loadInitialLogs();
    this.setupLogForwarding();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="view-title">System Logs</div>
      <div class="view-description">Monitor and filter system activity and runtime IPC notifications in real-time.</div>
      
      <div class="panel-grid">
        <div class="panel-main">
          <!-- Logs Filter bar -->
          <div class="glass-card" style="margin-bottom: 20px; padding: 12px 20px; display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; gap:10px; align-items:center;">
              <span style="font-size:0.85rem; color:var(--text-secondary);">Filter level:</span>
              <button class="primary-btn log-filter-btn active" data-level="all" style="padding: 6px 12px; font-size:0.8rem; background:rgba(255,255,255,0.06); border: 1px solid var(--border-color);">All</button>
              <button class="primary-btn log-filter-btn" data-level="info" style="padding: 6px 12px; font-size:0.8rem; background:transparent; border: 1px solid var(--border-color); color: var(--accent-cyan);">Info</button>
              <button class="primary-btn log-filter-btn" data-level="warn" style="padding: 6px 12px; font-size:0.8rem; background:transparent; border: 1px solid var(--border-color); color: var(--accent-amber);">Warn</button>
              <button class="primary-btn log-filter-btn" data-level="error" style="padding: 6px 12px; font-size:0.8rem; background:transparent; border: 1px solid var(--border-color); color: var(--accent-rose);">Error</button>
            </div>
            <button id="logs-clear-btn" class="primary-btn" style="padding: 6px 12px; font-size:0.8rem; background: rgba(244,63,94,0.1); color: var(--accent-rose); border: 1px solid rgba(244,63,94,0.25);">Clear Stream</button>
          </div>

          <!-- Logs Viewer Console -->
          <div class="console-block" id="logs-output" style="color:var(--text-primary); font-size:0.8rem;">
            <div class="console-line" style="color:var(--text-muted);">--- Waiting for telemetry feeds ---</div>
          </div>
        </div>

        <div class="panel-side">
          <div class="glass-card" style="height: 100%; display: flex; flex-direction: column; gap: 16px;">
            <h3 style="font-size: 1.1rem; font-weight:600;">Logs Metadata</h3>
            <div>
              <span style="font-size: 0.8rem; color: var(--text-muted);">Log Target:</span>
              <div style="font-weight: 500; font-size: 0.95rem; margin-top: 4px; font-family:var(--font-mono)">astra-system.log</div>
            </div>
            <div>
              <span style="font-size: 0.8rem; color: var(--text-muted);">Service:</span>
              <div style="font-weight: 500; font-size: 0.95rem; margin-top: 4px; color: var(--accent-cyan);">LogService.ts</div>
            </div>
            <div style="margin-top:auto; font-size:0.85rem; color: var(--text-secondary); line-height: 1.4;">
              The <strong>Logs Module</strong> acts as a unified hub. Developers can filter logs by level (Info, Warn, Error) or module categories to isolate issues.
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private attachEvents(): void {
    const clearBtn = this.container.querySelector('#logs-clear-btn') as HTMLButtonElement;
    const filterBtns = this.container.querySelectorAll('.log-filter-btn');
    const logsOutput = this.container.querySelector('#logs-output') as HTMLDivElement;

    clearBtn.addEventListener('click', () => {
      logsOutput.innerHTML = '<div class="console-line" style="color:var(--text-muted);">--- Log stream cleared ---</div>';
    });

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => {
          b.classList.remove('active');
          (b as HTMLButtonElement).style.background = 'transparent';
        });
        btn.classList.add('active');
        (btn as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';

        const filterLevel = btn.getAttribute('data-target') || btn.getAttribute('data-level');
        this.applyFilter(filterLevel || 'all');
      });
    });
  }

  private async loadInitialLogs(): Promise<void> {
    try {
      let initialLogs = [];
      if ((window as any).astraAPI?.getLogs) {
        initialLogs = await (window as any).astraAPI.getLogs();
      } else {
        // Browser Simulation logs
        initialLogs = [
          { timestamp: new Date(Date.now() - 5000).toISOString(), level: 'info', module: 'System', message: 'Preflight boot settings validated.' },
          { timestamp: new Date(Date.now() - 4000).toISOString(), level: 'info', module: 'AppController', message: 'Main window frame created.' },
          { timestamp: new Date(Date.now() - 3000).toISOString(), level: 'info', module: 'BrainService', message: 'AI Brain modules bindings registered.' },
          { timestamp: new Date(Date.now() - 2000).toISOString(), level: 'warn', module: 'VoiceService', message: 'Microphone hardware check returned inactive.' }
        ];
      }

      initialLogs.forEach((log: any) => this.appendLogLine(log));
    } catch (err) {
      console.error(err);
    }
  }

  private setupLogForwarding(): void {
    if ((window as any).astraAPI?.onLogEvent) {
      (window as any).astraAPI.onLogEvent((log: any) => {
        this.appendLogLine(log);
      });
    } else {
      // Browser Simulation: Periodically generate mock background logs
      setInterval(() => {
        const modules = ['BrainService', 'PlannerService', 'MemoryService', 'ToolManager', 'FileManager', 'BrowserController', 'TerminalController'];
        const levels = ['info', 'info', 'info', 'warn'] as const;
        const msgTemplates = [
          'Heartbeat packet validated.',
          'Checking queue items status.',
          'IPC listener execution response ok.',
          'Memory compression transaction complete.',
          'Cleaned temp directory.'
        ];

        const randomModule = modules[Math.floor(Math.random() * modules.length)];
        const randomLevel = levels[Math.floor(Math.random() * levels.length)];
        const randomMsg = msgTemplates[Math.floor(Math.random() * msgTemplates.length)];

        const mockLog = {
          timestamp: new Date().toISOString(),
          level: randomLevel,
          module: randomModule,
          message: randomMsg
        };

        const activePanel = document.querySelector('#logs-panel.active');
        if (activePanel) {
          this.appendLogLine(mockLog);
        }
      }, 5000);
    }
  }

  private appendLogLine(log: any): void {
    const logsOutput = this.container.querySelector('#logs-output') as HTMLDivElement;
    if (!logsOutput) return;

    // Check if placeholder is present
    if (logsOutput.innerText.includes('--- Waiting for telemetry feeds ---')) {
      logsOutput.innerHTML = '';
    }

    const line = document.createElement('div');
    line.className = 'console-line log-entry-node';
    line.setAttribute('data-level-type', log.level);
    
    let color = 'var(--text-secondary)';
    if (log.level === 'error') color = 'var(--accent-rose)';
    else if (log.level === 'warn') color = 'var(--accent-amber)';
    else if (log.level === 'info') color = 'var(--accent-cyan)';

    const timeStr = new Date(log.timestamp).toLocaleTimeString();
    line.innerHTML = `
      <span style="color: var(--text-muted); font-size:0.75rem;">[${timeStr}]</span>
      <span style="color: ${color}; font-weight:600; font-size:0.75rem;">[${log.level.toUpperCase()}]</span>
      <span style="color: var(--accent-purple); font-weight:500; font-size:0.75rem;">[${log.module}]</span>
      <span style="margin-left: 6px;">${log.message}</span>
    `;

    logsOutput.appendChild(line);
    logsOutput.scrollTop = logsOutput.scrollHeight;
  }

  private applyFilter(level: string): void {
    const logsOutput = this.container.querySelector('#logs-output') as HTMLDivElement;
    const entries = logsOutput.querySelectorAll('.log-entry-node');

    entries.forEach(node => {
      const nodeHtml = node as HTMLDivElement;
      const nodeLevel = nodeHtml.getAttribute('data-level-type');
      if (level === 'all' || nodeLevel === level) {
        nodeHtml.style.display = 'block';
      } else {
        nodeHtml.style.display = 'none';
      }
    });
  }
}
