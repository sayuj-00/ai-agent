export class TerminalPanel {
  private container: HTMLDivElement;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) as HTMLDivElement;
    this.render();
    this.attachEvents();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="view-title">Terminal Controller</div>
      <div class="view-description">Execute system operations and manage active terminal sessions.</div>
      
      <div class="panel-grid">
        <div class="panel-main">
          <div class="console-block" id="terminal-stdout">
            <div class="console-line">Astra Secure Shell Environment Ready.</div>
            <div class="console-line">Type a command to run (e.g. dir, git status, npm run dev)</div>
          </div>
          <div class="input-group">
            <span style="font-family: var(--font-mono); color: var(--accent-cyan); display: flex; align-items: center; padding: 0 10px; background: rgba(15, 23, 42, 0.4); border: 1px solid var(--border-color); border-radius: 8px 0 0 8px; border-right: none;">PS &gt;</span>
            <input type="text" id="terminal-input" class="custom-input" style="border-radius: 0 8px 8px 0;" placeholder="Type system commands here..." />
            <button id="terminal-execute-btn" class="primary-btn">Execute Command</button>
          </div>
        </div>

        <div class="panel-side">
          <div class="glass-card" style="height: 100%; display: flex; flex-direction: column; gap: 16px;">
            <h3 style="font-size: 1.1rem; font-weight:600;">Terminal Settings</h3>
            <div>
              <span style="font-size: 0.8rem; color: var(--text-muted);">Terminal Path:</span>
              <div style="font-weight: 500; font-size: 0.95rem; margin-top: 4px; font-family: var(--font-mono);">C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe</div>
            </div>
            <div>
              <span style="font-size: 0.8rem; color: var(--text-muted);">Active Service:</span>
              <div style="font-weight: 500; font-size: 0.95rem; margin-top: 4px; color: var(--accent-cyan);">TerminalController.ts</div>
            </div>
            <div style="margin-top:auto; font-size:0.85rem; color: var(--text-secondary); line-height: 1.4;">
              The <strong>Terminal Controller</strong> spawns system shells, streaming logs back in real-time, executing tasks within predefined security guidelines.
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private attachEvents(): void {
    const input = this.container.querySelector('#terminal-input') as HTMLInputElement;
    const executeBtn = this.container.querySelector('#terminal-execute-btn') as HTMLButtonElement;
    const stdout = this.container.querySelector('#terminal-stdout') as HTMLDivElement;

    const runCommand = async () => {
      const cmd = input.value.trim();
      if (!cmd) return;

      this.appendLine(`PS C:\\Users\\sayuj peter Sajan\\OneDrive\Desktop\\AI Agent> ${cmd}`);
      input.value = '';

      const loaderId = this.appendLine('Running command...');

      try {
        let output = '';
        if ((window as any).astraAPI?.executeCommand) {
          const session = await (window as any).astraAPI.executeCommand(cmd);
          output = session.output;
        } else {
          // Browser Simulation
          await new Promise(resolve => setTimeout(resolve, 800));
          output = `[Simulated Terminal Output]:\nSpawning child process for "${cmd}"...\nProcess finished with exit code 0.`;
        }

        const loader = this.container.querySelector(`#${loaderId}`) as HTMLDivElement;
        if (loader) {
          loader.innerText = output;
        }
      } catch (err: any) {
        const loader = this.container.querySelector(`#${loaderId}`) as HTMLDivElement;
        if (loader) {
          loader.innerText = `Shell process failed: ${err.message}`;
          loader.style.color = 'var(--accent-rose)';
        }
      }
    };

    executeBtn.addEventListener('click', runCommand);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        runCommand();
      }
    });
  }

  private appendLine(text: string): string {
    const stdout = this.container.querySelector('#terminal-stdout') as HTMLDivElement;
    const div = document.createElement('div');
    const id = `line_${Math.random().toString(36).substr(2, 9)}`;
    div.id = id;
    div.className = 'console-line';
    div.innerText = text;
    stdout.appendChild(div);
    stdout.scrollTop = stdout.scrollHeight;
    return id;
  }
}
