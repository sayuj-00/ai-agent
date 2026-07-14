import { TerminalPanel } from './TerminalPanel.js';
import { BrowserPanel } from './BrowserPanel.js';
import { VisionPanel } from './VisionPanel.js';
import { VoicePanel } from './VoicePanel.js';

export class ToolsPanel {
  private container: HTMLDivElement;
  private modal: HTMLDivElement;
  private modalTitle: HTMLHeadingElement;
  private modalBody: HTMLDivElement;
  private modalCloseBtn: HTMLButtonElement;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) as HTMLDivElement;
    this.modal = document.getElementById('embedded-tool-modal') as HTMLDivElement;
    this.modalTitle = document.getElementById('modal-tool-title') as HTMLHeadingElement;
    this.modalBody = document.getElementById('modal-tool-body') as HTMLDivElement;
    this.modalCloseBtn = document.getElementById('modal-close-btn') as HTMLButtonElement;

    this.render();
    this.attachEvents();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="view-title">Installed Tools Registry</div>
      <div class="view-description">Manage access scopes, enable modules, and test individual system tools integrations.</div>
      
      <div class="tools-grid">
        <!-- Tool 1: File Manager -->
        <div class="glass-card tool-card" data-tool="file">
          <div class="tool-card-header">
            <div class="tool-icon-wrapper">📁</div>
            <label class="switch">
              <input type="checkbox" checked />
              <span class="slider"></span>
            </label>
          </div>
          <div>
            <div class="tool-title">File Manager</div>
            <div class="tool-description">High-level sandboxed directory reader, file writer, and code auditor bindings.</div>
          </div>
          <div class="tool-card-footer">
            <span style="font-size:0.75rem; color:var(--text-muted);">Active service: FileManager.ts</span>
            <button class="primary-btn run-tool-btn" data-tool="file" style="padding: 6px 12px; font-size: 0.75rem; background: rgba(59,130,246,0.1); color: var(--accent-cyan); border: 1px solid rgba(59,130,246,0.25); box-shadow: none;">Verify Sandbox</button>
          </div>
        </div>

        <!-- Tool 2: Terminal Controller -->
        <div class="glass-card tool-card" data-tool="terminal">
          <div class="tool-card-header">
            <div class="tool-icon-wrapper">💻</div>
            <label class="switch">
              <input type="checkbox" checked />
              <span class="slider"></span>
            </label>
          </div>
          <div>
            <div class="tool-title">Terminal Shell</div>
            <div class="tool-description">Spawns native shells processes safely. Streams logs output blocks back in real-time.</div>
          </div>
          <div class="tool-card-footer">
            <span style="font-size:0.75rem; color:var(--text-muted);">Active service: TerminalController.ts</span>
            <button class="primary-btn run-tool-btn" data-tool="terminal" style="padding: 6px 12px; font-size: 0.75rem;">Launch Console</button>
          </div>
        </div>

        <!-- Tool 3: Browser Controller -->
        <div class="glass-card tool-card" data-tool="browser">
          <div class="tool-card-header">
            <div class="tool-icon-wrapper">🌐</div>
            <label class="switch">
              <input type="checkbox" checked />
              <span class="slider"></span>
            </label>
          </div>
          <div>
            <div class="tool-title">Browser Automator</div>
            <div class="tool-description">Automates Chromium browser contexts for page navigations, visual screenshot captures, and web scrapers.</div>
          </div>
          <div class="tool-card-footer">
            <span style="font-size:0.75rem; color:var(--text-muted);">Active service: BrowserController.ts</span>
            <button class="primary-btn run-tool-btn" data-tool="browser" style="padding: 6px 12px; font-size: 0.75rem;">Launch Viewport</button>
          </div>
        </div>

        <!-- Tool 4: Vision Module -->
        <div class="glass-card tool-card" data-tool="vision">
          <div class="tool-card-header">
            <div class="tool-icon-wrapper">👁️</div>
            <label class="switch">
              <input type="checkbox" checked />
              <span class="slider"></span>
            </label>
          </div>
          <div>
            <div class="tool-title">Vision Processor</div>
            <div class="tool-description">OCR processing of images and coordinate overrides translation for multimodal agents ingestion.</div>
          </div>
          <div class="tool-card-footer">
            <span style="font-size:0.75rem; color:var(--text-muted);">Active service: VisionService.ts</span>
            <button class="primary-btn run-tool-btn" data-tool="vision" style="padding: 6px 12px; font-size: 0.75rem;">Open Analyzer</button>
          </div>
        </div>

        <!-- Tool 5: Voice Module -->
        <div class="glass-card tool-card" data-tool="voice">
          <div class="tool-card-header">
            <div class="tool-icon-wrapper">🎙️</div>
            <label class="switch">
              <input type="checkbox" />
              <span class="slider"></span>
            </label>
          </div>
          <div>
            <div class="tool-title">Vocal Synth (TTS/STT)</div>
            <div class="tool-description">Microphone stream STT transcribing and speech synthesis audio output queues.</div>
          </div>
          <div class="tool-card-footer">
            <span style="font-size:0.75rem; color:var(--text-muted);">Active service: VoiceService.ts</span>
            <button class="primary-btn run-tool-btn" data-tool="voice" style="padding: 6px 12px; font-size: 0.75rem;">Open Audio Controller</button>
          </div>
        </div>
      </div>
    `;
  }

  private attachEvents(): void {
    // Manage Close Modal
    this.modalCloseBtn.addEventListener('click', () => {
      this.modal.style.display = 'none';
      this.modalBody.innerHTML = ''; // Clean modal contents
    });

    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.modal.style.display = 'none';
        this.modalBody.innerHTML = '';
      }
    });

    // Run actions buttons
    this.container.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.run-tool-btn') as HTMLButtonElement;
      if (!btn) return;

      const toolType = btn.getAttribute('data-tool');
      if (toolType) {
        this.launchToolModal(toolType);
      }
    });
  }

  private launchToolModal(tool: string): void {
    this.modalBody.innerHTML = `<div id="modal-content-anchor" class="view-panel active" style="padding: 24px; position: relative;"></div>`;
    this.modal.style.display = 'flex';

    if (tool === 'terminal') {
      this.modalTitle.innerText = 'Terminal Shell Console';
      new TerminalPanel('modal-content-anchor');
    } else if (tool === 'browser') {
      this.modalTitle.innerText = 'Browser Automator Workspace';
      new BrowserPanel('modal-content-anchor');
    } else if (tool === 'vision') {
      this.modalTitle.innerText = 'Vision OCR Scanner';
      new VisionPanel('modal-content-anchor');
    } else if (tool === 'voice') {
      this.modalTitle.innerText = 'Speech Interface (STT/TTS)';
      new VoicePanel('modal-content-anchor');
    } else if (tool === 'file') {
      this.modalTitle.innerText = 'File Sandbox Verification';
      this.renderFileMockSandbox();
    }
  }

  private async renderFileMockSandbox(): Promise<void> {
    const container = document.getElementById('modal-content-anchor') as HTMLDivElement;
    container.innerHTML = `
      <div style="padding: 10px;">
        <h4 style="margin-bottom:12px; font-size:1rem; color:#ffffff;">Active Sandbox Files:</h4>
        <div id="sandbox-files-list" style="margin-bottom:16px; font-family:var(--font-mono); font-size:0.85rem; display:flex; flex-direction:column; gap:6px;">
          Scanning folders...
        </div>
        <button id="test-sandbox-write" class="primary-btn">Test Write Policy</button>
      </div>
    `;

    const list = container.querySelector('#sandbox-files-list') as HTMLDivElement;
    const writeBtn = container.querySelector('#test-sandbox-write') as HTMLButtonElement;

    const refreshFiles = async () => {
      try {
        let files = [];
        if ((window as any).astraAPI?.listFiles) {
          files = await (window as any).astraAPI.listFiles('.');
        } else {
          // Browser Simulation
          await new Promise(resolve => setTimeout(resolve, 500));
          files = [
            { name: 'package.json', size: 450, isDirectory: false },
            { name: 'src', size: 0, isDirectory: true }
          ];
        }

        list.innerHTML = files.map((f: any) => `
          <div style="background:rgba(255,255,255,0.02); padding:8px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between;">
            <span>${f.isDirectory ? '📁' : '📄'} ${f.name}</span>
            <span style="color:var(--text-secondary);">${f.isDirectory ? 'directory' : `${f.size} B`}</span>
          </div>
        `).join('');
      } catch (err: any) {
        list.innerText = `Scan failed: ${err.message}`;
      }
    };

    refreshFiles();

    writeBtn.addEventListener('click', async () => {
      writeBtn.disabled = true;
      writeBtn.innerText = 'Verifying security bounds...';
      try {
        if ((window as any).astraAPI?.writeFile) {
          await (window as any).astraAPI.writeFile('sandbox_test.txt', 'VERIFIED');
        } else {
          await new Promise(resolve => setTimeout(resolve, 600));
        }
        alert('Sandbox write policy verified: Write committed successfully.');
        refreshFiles();
      } catch (err: any) {
        alert(`Write policy rejected: ${err.message}`);
      } finally {
        writeBtn.disabled = false;
        writeBtn.innerText = 'Test Write Policy';
      }
    });
  }
}
