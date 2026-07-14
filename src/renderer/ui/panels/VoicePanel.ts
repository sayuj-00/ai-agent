export class VoicePanel {
  private container: HTMLDivElement;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) as HTMLDivElement;
    this.render();
    this.attachEvents();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="view-title">Voice Module</div>
      <div class="view-description">Control auditory interaction settings, speech-to-text feedback, and voice synthesis outputs.</div>
      
      <div class="panel-grid">
        <div class="panel-main">
          <!-- Voice Controls -->
          <div class="glass-card" style="display:flex; justify-content:space-around; align-items:center; padding:40px 20px; gap:20px; flex-wrap:wrap;">
            <button id="voice-listen-btn" class="primary-btn" style="border-radius:50%; width:100px; height:100px; font-size:2rem; padding:0; display:flex; align-items:center; justify-content:center; box-shadow:0 0 15px rgba(56,189,248,0.25);">🎙️</button>
            <div id="voice-visualizer" style="display:none; align-items:center; gap:4px; height:50px;">
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
            </div>
            <div id="voice-visualizer-placeholder" style="color:var(--text-secondary); font-style:italic;">
              Click microphone to start listening...
            </div>
          </div>

          <!-- Text to Speech Card -->
          <div class="glass-card">
            <h3 style="font-size: 1.1rem; font-weight:600; margin-bottom: 12px;">Speech Synthesis Sandbox</h3>
            <div class="input-group">
              <input type="text" id="tts-input" class="custom-input" placeholder="Type text for Astra to speak aloud..." />
              <button id="tts-btn" class="primary-btn">Speak Aloud</button>
            </div>
          </div>
        </div>

        <div class="panel-side">
          <div class="glass-card" style="height: 100%; display: flex; flex-direction: column; gap: 16px;">
            <h3 style="font-size: 1.1rem; font-weight:600;">Speech Output Logs</h3>
            
            <div>
              <span style="font-size: 0.8rem; color: var(--text-muted);">Transcription Output:</span>
              <div style="font-size: 0.95rem; font-style: italic; margin-top: 4px; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px; border: 1px solid var(--border-color);" id="stt-transcription">
                No active transcription recorded.
              </div>
            </div>

            <div>
              <span style="font-size: 0.8rem; color: var(--text-muted);">Active Service:</span>
              <div style="font-weight: 500; font-size: 0.95rem; margin-top: 4px; color: var(--accent-cyan);">VoiceService.ts</div>
            </div>
            
            <div style="margin-top:auto; font-size:0.85rem; color: var(--text-secondary); line-height: 1.4;">
              The <strong>Voice Module</strong> interfaces with native system microphone devices and speaker hardware, handling speech queues and audio format codecs safely.
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private attachEvents(): void {
    const listenBtn = this.container.querySelector('#voice-listen-btn') as HTMLButtonElement;
    const visualizer = this.container.querySelector('#voice-visualizer') as HTMLDivElement;
    const placeholder = this.container.querySelector('#voice-visualizer-placeholder') as HTMLDivElement;
    const transcription = this.container.querySelector('#stt-transcription') as HTMLDivElement;

    const ttsInput = this.container.querySelector('#tts-input') as HTMLInputElement;
    const ttsBtn = this.container.querySelector('#tts-btn') as HTMLButtonElement;

    // Listen STT
    listenBtn.addEventListener('click', async () => {
      listenBtn.disabled = true;
      listenBtn.style.boxShadow = '0 0 25px rgba(168,85,247,0.6)';
      listenBtn.style.border = '2px solid var(--accent-purple)';
      
      placeholder.style.display = 'none';
      visualizer.style.display = 'flex';
      transcription.innerText = 'Listening closely...';

      try {
        let text = '';
        if ((window as any).astraAPI?.listen) {
          text = await (window as any).astraAPI.listen();
        } else {
          // Browser Simulation
          await new Promise(resolve => setTimeout(resolve, 2000));
          text = 'Hey Astra, verify that the voice interface placeholders are fully linked.';
        }

        transcription.innerText = `"${text}"`;
      } catch (err: any) {
        transcription.innerText = `Speech transcription error: ${err.message}`;
      } finally {
        listenBtn.disabled = false;
        listenBtn.style.boxShadow = '0 0 15px rgba(56,189,248,0.25)';
        listenBtn.style.border = 'none';
        placeholder.style.display = 'block';
        visualizer.style.display = 'none';
      }
    });

    // Speak TTS
    ttsBtn.addEventListener('click', async () => {
      const text = ttsInput.value.trim();
      if (!text) return;

      ttsBtn.disabled = true;
      ttsBtn.innerText = 'Speaking...';

      try {
        if ((window as any).astraAPI?.speak) {
          await (window as any).astraAPI.speak(text);
        } else {
          // Browser Simulation
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
        ttsInput.value = '';
      } catch (err) {
        console.error(err);
      } finally {
        ttsBtn.disabled = false;
        ttsBtn.innerText = 'Speak Aloud';
      }
    });
  }
}
