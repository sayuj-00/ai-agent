export class BrowserPanel {
  private container: HTMLDivElement;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) as HTMLDivElement;
    this.render();
    this.attachEvents();
    this.pollStatus();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="view-title">Browser Controller</div>
      <div class="view-description">Launch and automate sandboxed chromium environments for web searching and data retrieval.</div>
      
      <div class="panel-grid">
        <div class="panel-main">
          <!-- Navigation Bar -->
          <div class="glass-card" style="margin-bottom: 20px; padding: 16px;">
            <div style="display:flex; gap:12px; align-items:center;">
              <button id="browser-launch-btn" class="primary-btn" style="padding: 10px 16px;">Launch Instance</button>
              <input type="text" id="browser-url-input" class="custom-input" placeholder="Enter target URL... (e.g. https://github.com)" disabled />
              <button id="browser-go-btn" class="primary-btn" style="padding: 10px 16px;" disabled>Navigate</button>
              <button id="browser-close-btn" class="primary-btn" style="padding: 10px 16px; background: rgba(244,63,94,0.1); color: var(--accent-rose); border: 1px solid rgba(244,63,94,0.25); display:none;">Close</button>
            </div>
          </div>

          <!-- Web View Simulator -->
          <div class="glass-card" style="flex-grow:1; display:flex; flex-direction:column; overflow:hidden; min-height: 300px; justify-content:center; align-items:center; background:#020617; border: 1px solid var(--border-color);">
            <div id="viewport-state-container" style="display:flex; flex-direction:column; align-items:center; gap:16px; color: var(--text-secondary);">
              <span style="font-size:3rem;">🌐</span>
              <div>No active browser session detected. Click "Launch Instance" above.</div>
            </div>
          </div>
        </div>

        <div class="panel-side">
          <div class="glass-card" style="height: 100%; display: flex; flex-direction: column; gap: 16px;">
            <h3 style="font-size: 1.1rem; font-weight:600;">Browser Status</h3>
            
            <div>
              <span style="font-size: 0.8rem; color: var(--text-muted);">Session State:</span>
              <div style="font-weight: 500; font-size: 0.95rem; margin-top: 4px;" id="browser-session-badge">CLOSED</div>
            </div>
            
            <div>
              <span style="font-size: 0.8rem; color: var(--text-muted);">Current Context:</span>
              <div style="font-weight: 500; font-size: 0.95rem; margin-top: 4px; overflow-wrap: break-word;" id="browser-context-url">none</div>
            </div>

            <div>
              <span style="font-size: 0.8rem; color: var(--text-muted);">Active Service:</span>
              <div style="font-weight: 500; font-size: 0.95rem; margin-top: 4px; color: var(--accent-cyan);">BrowserController.ts</div>
            </div>

            <button id="browser-screenshot-btn" class="primary-btn" style="margin-top:20px;" disabled>Capture Viewport</button>
            
            <div style="margin-top:auto; font-size:0.85rem; color: var(--text-secondary); line-height: 1.4;">
              The <strong>Browser Controller</strong> initializes custom browser profiles, automates elements selectors clicks, and captures layout visual inputs for vision models parsing.
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private attachEvents(): void {
    const launchBtn = this.container.querySelector('#browser-launch-btn') as HTMLButtonElement;
    const closeBtn = this.container.querySelector('#browser-close-btn') as HTMLButtonElement;
    const urlInput = this.container.querySelector('#browser-url-input') as HTMLInputElement;
    const goBtn = this.container.querySelector('#browser-go-btn') as HTMLButtonElement;
    const screenshotBtn = this.container.querySelector('#browser-screenshot-btn') as HTMLButtonElement;

    // Launch browser
    launchBtn.addEventListener('click', async () => {
      launchBtn.disabled = true;
      launchBtn.innerText = 'Spawning context...';

      try {
        if ((window as any).astraAPI?.launchBrowser) {
          await (window as any).astraAPI.launchBrowser(true);
        } else {
          // Browser Simulation
          await new Promise(resolve => setTimeout(resolve, 800));
        }
        this.updateUiState(true, 'https://www.google.com');
      } catch (err) {
        console.error(err);
        launchBtn.disabled = false;
        launchBtn.innerText = 'Launch Instance';
      }
    });

    // Navigate url
    goBtn.addEventListener('click', async () => {
      const url = urlInput.value.trim();
      if (!url) return;

      goBtn.disabled = true;
      goBtn.innerText = 'Loading...';

      try {
        if ((window as any).astraAPI?.navigateBrowser) {
          await (window as any).astraAPI.navigateBrowser(url);
        } else {
          // Browser Simulation
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        this.updateUiState(true, url);
      } catch (err) {
        console.error(err);
      } finally {
        goBtn.disabled = false;
        goBtn.innerText = 'Navigate';
      }
    });

    // Close session
    closeBtn.addEventListener('click', async () => {
      try {
        if ((window as any).astraAPI?.closeBrowser) {
          await (window as any).astraAPI.closeBrowser();
        }
        this.updateUiState(false, 'about:blank');
      } catch (err) {
        console.error(err);
      }
    });

    // Capture screenshot
    screenshotBtn.addEventListener('click', async () => {
      screenshotBtn.disabled = true;
      screenshotBtn.innerText = 'Capturing...';
      
      const viewport = this.container.querySelector('#viewport-state-container') as HTMLDivElement;
      viewport.innerHTML = '<div style="color: var(--text-secondary);">Taking layout capture stream...</div>';

      try {
        if ((window as any).astraAPI?.screenshotBrowser) {
          await (window as any).astraAPI.screenshotBrowser();
        }
        // Simulation delay
        await new Promise(resolve => setTimeout(resolve, 600));

        viewport.innerHTML = `
          <div style="border: 2px dashed rgba(56, 189, 248, 0.4); border-radius: 8px; padding: 40px; text-align:center; color: var(--accent-cyan); background: rgba(56, 189, 248, 0.05);">
            <span style="font-size:2rem; display:block; margin-bottom:10px;">📸</span>
            Viewport snapshot committed dynamically to workspace folder.
          </div>
        `;
      } catch (err) {
        console.error(err);
      } finally {
        screenshotBtn.disabled = false;
        screenshotBtn.innerText = 'Capture Viewport';
      }
    });
  }

  private async pollStatus(): Promise<void> {
    try {
      if ((window as any).astraAPI?.getBrowserStatus) {
        const status = await (window as any).astraAPI.getBrowserStatus();
        this.updateUiState(status.isOpen, status.url);
      }
    } catch (err) {
      console.error(err);
    }
  }

  private updateUiState(isOpen: boolean, url: string): void {
    const launchBtn = this.container.querySelector('#browser-launch-btn') as HTMLButtonElement;
    const closeBtn = this.container.querySelector('#browser-close-btn') as HTMLButtonElement;
    const urlInput = this.container.querySelector('#browser-url-input') as HTMLInputElement;
    const goBtn = this.container.querySelector('#browser-go-btn') as HTMLButtonElement;
    const screenshotBtn = this.container.querySelector('#browser-screenshot-btn') as HTMLButtonElement;
    
    const stateBadge = this.container.querySelector('#browser-session-badge') as HTMLDivElement;
    const contextUrl = this.container.querySelector('#browser-context-url') as HTMLDivElement;
    const viewport = this.container.querySelector('#viewport-state-container') as HTMLDivElement;

    if (isOpen) {
      launchBtn.style.display = 'none';
      closeBtn.style.display = 'block';
      
      urlInput.disabled = false;
      urlInput.value = url;
      goBtn.disabled = false;
      screenshotBtn.disabled = false;

      stateBadge.innerText = 'RUNNING';
      stateBadge.style.color = 'var(--accent-green)';
      contextUrl.innerText = url;

      viewport.innerHTML = `
        <div style="text-align:center; display:flex; flex-direction:column; gap:12px; color: var(--accent-cyan)">
          <div style="font-size:2.5rem; animation: active-pulse 2s infinite;">🌐</div>
          <div style="font-weight: 500;">Active Session: Headless Browser Window Spawned</div>
          <div style="font-size:0.85rem; color: var(--text-secondary);">${url}</div>
        </div>
      `;
    } else {
      launchBtn.style.display = 'block';
      launchBtn.disabled = false;
      launchBtn.innerText = 'Launch Instance';
      
      closeBtn.style.display = 'none';
      
      urlInput.disabled = true;
      urlInput.value = '';
      goBtn.disabled = true;
      screenshotBtn.disabled = true;

      stateBadge.innerText = 'CLOSED';
      stateBadge.style.color = 'var(--accent-rose)';
      contextUrl.innerText = 'none';

      viewport.innerHTML = `
        <span style="font-size:3rem;">🌐</span>
        <div>No active browser session detected. Click "Launch Instance" above.</div>
      `;
    }
  }
}
