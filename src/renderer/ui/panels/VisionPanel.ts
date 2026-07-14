export class VisionPanel {
  private container: HTMLDivElement;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) as HTMLDivElement;
    this.render();
    this.attachEvents();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="view-title">Vision Module</div>
      <div class="view-description">Analyze captured window screenshots, OCR textual templates, and detect elements bounds.</div>
      
      <div class="panel-grid">
        <div class="panel-main">
          <!-- Dropzone and Canvas Simulation -->
          <div class="glass-card" style="flex-grow:1; display:flex; flex-direction:column; overflow:hidden; min-height: 250px; justify-content:center; align-items:center; border: 2px dashed var(--border-color); cursor: pointer;" id="vision-dropzone">
            <span style="font-size:2.5rem; margin-bottom:12px;">🖼️</span>
            <div style="font-weight: 500;">Select or drag image file here</div>
            <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">Supports PNG, JPEG, WEBP files</div>
          </div>

          <div class="input-group" style="justify-content: flex-end;">
            <button id="vision-analyze-btn" class="primary-btn" disabled>Process Graphic</button>
          </div>
        </div>

        <div class="panel-side">
          <div class="glass-card" style="height: 100%; display: flex; flex-direction: column; gap: 16px;">
            <h3 style="font-size: 1.1rem; font-weight:600;">Vision Feedback</h3>
            
            <div id="vision-result-box" style="display:none; flex-direction:column; gap:12px;">
              <div>
                <span style="font-size: 0.8rem; color: var(--text-muted);">Summary:</span>
                <div style="font-size: 0.9rem; margin-top: 4px;" id="vision-desc">none</div>
              </div>
              
              <div>
                <span style="font-size: 0.8rem; color: var(--text-muted);">OCR Text:</span>
                <div style="font-size: 0.85rem; font-family:var(--font-mono); margin-top: 4px; padding:8px; background:rgba(0,0,0,0.2); border-radius:4px;" id="vision-ocr">none</div>
              </div>

              <div>
                <span style="font-size: 0.8rem; color: var(--text-muted);">Detected Layout Nodes:</span>
                <div style="font-size: 0.85rem; margin-top: 4px;" id="vision-elements">none</div>
              </div>
            </div>
            
            <div id="vision-result-empty" style="color: var(--text-secondary); font-size: 0.9rem;">
              Upload an image first to display model prediction scores.
            </div>

            <div style="margin-top:auto; font-size:0.85rem; color: var(--text-secondary); line-height: 1.4;">
              The <strong>Vision Module</strong> uses multimodal deep learning pipelines to inspect screenshots, providing coordinates overlays for desktop automation.
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private attachEvents(): void {
    const dropzone = this.container.querySelector('#vision-dropzone') as HTMLDivElement;
    const analyzeBtn = this.container.querySelector('#vision-analyze-btn') as HTMLButtonElement;
    
    const resultBox = this.container.querySelector('#vision-result-box') as HTMLDivElement;
    const resultEmpty = this.container.querySelector('#vision-result-empty') as HTMLDivElement;
    
    const descText = this.container.querySelector('#vision-desc') as HTMLDivElement;
    const ocrText = this.container.querySelector('#vision-ocr') as HTMLDivElement;
    const elementsText = this.container.querySelector('#vision-elements') as HTMLDivElement;

    let hasFile = false;

    dropzone.addEventListener('click', () => {
      // Simulate file selection
      hasFile = true;
      dropzone.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; gap:8px; color: var(--accent-cyan)">
          <span style="font-size:2.5rem;">📸</span>
          <div style="font-weight: 500;">screenshot_active_workspace.png</div>
          <div style="font-size:0.8rem; color:var(--text-secondary);">Size: 84 KB (Ready to process)</div>
        </div>
      `;
      dropzone.style.borderColor = 'var(--accent-cyan)';
      dropzone.style.background = 'rgba(56, 189, 248, 0.02)';
      analyzeBtn.disabled = false;
    });

    analyzeBtn.addEventListener('click', async () => {
      if (!hasFile) return;

      analyzeBtn.disabled = true;
      analyzeBtn.innerText = 'Analyzing layout...';

      try {
        let res;
        if ((window as any).astraAPI?.analyzeImage) {
          res = await (window as any).astraAPI.analyzeImage('screenshot.png');
        } else {
          // Browser Simulation
          await new Promise(resolve => setTimeout(resolve, 800));
          res = {
            description: 'Simulated preview showing the Astra UI editor layout workspace.',
            detectedElements: [
              { label: 'SidebarItem', bounds: { x: 10, y: 15, w: 200, h: 40 } },
              { label: 'LogContainer', bounds: { x: 230, y: 400, w: 800, h: 300 } }
            ],
            ocrText: 'Astra AI Assistant Setup'
          };
        }

        resultEmpty.style.display = 'none';
        resultBox.style.display = 'flex';
        
        descText.innerText = res.description;
        ocrText.innerText = res.ocrText || 'No text detected';
        elementsText.innerHTML = res.detectedElements.map((e: any) => `
          <div style="margin-bottom:4px; font-family:var(--font-mono); font-size:0.8rem;">
            - <strong>${e.label}</strong>: bounds[x:${e.bounds.x}, y:${e.bounds.y}, w:${e.bounds.w}, h:${e.bounds.h}]
          </div>
        `).join('');

      } catch (err) {
        console.error(err);
      } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.innerText = 'Process Graphic';
      }
    });
  }
}
