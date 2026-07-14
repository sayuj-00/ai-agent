export class SettingsPanel {
  private container: HTMLDivElement;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) as HTMLDivElement;
    this.render();
    this.attachEvents();
    this.loadSettings();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="view-title">Application Settings</div>
      <div class="view-description">Manage API keys, select default models, adjust safety overrides, and customize UI themes.</div>
      
      <div class="panel-grid">
        <div class="panel-main">
          <div class="glass-card" style="display:flex; flex-direction:column; gap:20px;">
            <h3 style="font-size: 1.1rem; font-weight:600; margin-bottom:4px;">Configuration Profiles</h3>
            
            <div style="display:flex; flex-direction:column; gap:6px;">
              <label style="font-size:0.85rem; color:var(--text-secondary); font-weight:500;">Gemini API Credential Key</label>
              <input type="password" id="settings-api-key" class="custom-input" placeholder="AIzaSy..." />
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
              <div style="display:flex; flex-direction:column; gap:6px;">
                <label style="font-size:0.85rem; color:var(--text-secondary); font-weight:500;">Default Engine Model</label>
                <select id="settings-model" class="custom-input" style="background-color: var(--bg-primary);">
                  <option value="gemini-3.5-flash">Gemini 3.5 Flash (Recommended)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  <option value="gemini-2.0-experimental">Gemini 2.0 Experimental</option>
                </select>
              </div>

              <div style="display:flex; flex-direction:column; gap:6px;">
                <label style="font-size:0.85rem; color:var(--text-secondary); font-weight:500;">User Interface Theme</label>
                <select id="settings-theme" class="custom-input" style="background-color: var(--bg-primary);">
                  <option value="glass">Glassmorphism (Default)</option>
                  <option value="dark">Solid Dark Mode</option>
                  <option value="light">Classic Light Mode</option>
                </select>
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
              <div style="display:flex; flex-direction:column; gap:6px;">
                <label style="font-size:0.85rem; color:var(--text-secondary); font-weight:500;">Agent Safety Level</label>
                <select id="settings-safety" class="custom-input" style="background-color: var(--bg-primary);">
                  <option value="standard">Standard Level Filters</option>
                  <option value="strict">Strict Protection Rules</option>
                  <option value="relaxed">Relaxed Developer Mode</option>
                </select>
              </div>

              <div style="display:flex; flex-direction:column; gap:6px; justify-content:center;">
                <div style="display:flex; align-items:center; gap:10px; margin-top:16px;">
                  <input type="checkbox" id="settings-voice-enabled" style="width:18px; height:18px; cursor:pointer;" />
                  <label for="settings-voice-enabled" style="font-size:0.85rem; color:var(--text-secondary); cursor:pointer; font-weight:500;">Enable Conversational Voice Outputs</label>
                </div>
              </div>
            </div>

            <div style="display:flex; justify-content:flex-end; margin-top:20px; border-top: 1px solid var(--border-color); padding-top:20px;">
              <button id="settings-save-btn" class="primary-btn">Save Configuration</button>
            </div>
          </div>
        </div>

        <div class="panel-side">
          <div class="glass-card" style="height: 100%; display: flex; flex-direction: column; gap: 16px;">
            <h3 style="font-size: 1.1rem; font-weight:600;">Safety & Scope</h3>
            <p style="font-size:0.85rem; color:var(--text-secondary); line-height: 1.4;">
              Safety configurations restrict agent commands execution permissions.
            </p>
            <p style="font-size:0.85rem; color:var(--text-secondary); line-height: 1.4;">
              API credentials are saved locally in the sandboxed app folder.
            </p>
            <div style="margin-top:auto; font-size:0.85rem; color: var(--text-secondary); line-height: 1.4;">
              The <strong>Settings Module</strong> handles reading/writing profiles and dynamically applying styles themes parameters across the DOM layouts.
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private attachEvents(): void {
    const saveBtn = this.container.querySelector('#settings-save-btn') as HTMLButtonElement;
    
    const apiKey = this.container.querySelector('#settings-api-key') as HTMLInputElement;
    const model = this.container.querySelector('#settings-model') as HTMLSelectElement;
    const theme = this.container.querySelector('#settings-theme') as HTMLSelectElement;
    const safety = this.container.querySelector('#settings-safety') as HTMLSelectElement;
    const voiceEnabled = this.container.querySelector('#settings-voice-enabled') as HTMLInputElement;

    saveBtn.addEventListener('click', async () => {
      saveBtn.disabled = true;
      saveBtn.innerText = 'Saving changes...';

      const configUpdate = {
        apiKey: apiKey.value.trim(),
        defaultModel: model.value,
        theme: theme.value,
        safetyLevel: safety.value,
        voiceEnabled: voiceEnabled.checked
      };

      try {
        if ((window as any).astraAPI?.updateSettings) {
          await (window as any).astraAPI.updateSettings(configUpdate);
        } else {
          // Browser Simulation
          console.log('[Simulated Save Settings]', configUpdate);
          await new Promise(resolve => setTimeout(resolve, 600));
        }

        // Apply theme/model pill changes visually on current screen
        const modelPill = document.getElementById('active-model-pill');
        if (modelPill) {
          modelPill.innerText = model.value === 'gemini-3.5-flash' ? 'Gemini 3.5 Flash' : (model.value === 'gemini-1.5-pro' ? 'Gemini 1.5 Pro' : 'Gemini 2.0 Exp');
        }

        const safetyPill = document.getElementById('safety-level-pill');
        if (safetyPill) {
          safetyPill.innerText = `Safety: ${safety.value.toUpperCase()}`;
          safetyPill.className = `status-badge ${safety.value === 'strict' ? 'badge-amber' : (safety.value === 'relaxed' ? 'badge-rose' : 'badge-green')}`;
        }

      } catch (err) {
        console.error(err);
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = 'Save Configuration';
      }
    });
  }

  private async loadSettings(): Promise<void> {
    try {
      let activeConfig: any = {};
      if ((window as any).astraAPI?.getSettings) {
        activeConfig = await (window as any).astraAPI.getSettings();
      } else {
        // Browser Simulation defaults
        activeConfig = {
          apiKey: 'AIzaSyMOCK_SECRET_KEY_123',
          defaultModel: 'gemini-3.5-flash',
          theme: 'glass',
          safetyLevel: 'standard',
          voiceEnabled: false
        };
      }

      const apiKey = this.container.querySelector('#settings-api-key') as HTMLInputElement;
      const model = this.container.querySelector('#settings-model') as HTMLSelectElement;
      const theme = this.container.querySelector('#settings-theme') as HTMLSelectElement;
      const safety = this.container.querySelector('#settings-safety') as HTMLSelectElement;
      const voiceEnabled = this.container.querySelector('#settings-voice-enabled') as HTMLInputElement;

      apiKey.value = activeConfig.apiKey || '';
      model.value = activeConfig.defaultModel || 'gemini-3.5-flash';
      theme.value = activeConfig.theme || 'glass';
      safety.value = activeConfig.safetyLevel || 'standard';
      voiceEnabled.checked = activeConfig.voiceEnabled || false;

    } catch (err) {
      console.error(err);
    }
  }
}
