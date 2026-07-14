export class MemoryPanel {
  private container: HTMLDivElement;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) as HTMLDivElement;
    this.render();
    this.attachEvents();
    this.refreshMemories();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="view-title">Memory Module</div>
      <div class="view-description">View, search, and manage long-term semantic embeddings and working short-term context.</div>
      
      <div class="panel-grid">
        <div class="panel-main">
          <!-- Recall Search -->
          <div class="glass-card" style="margin-bottom: 20px;">
            <div style="display:flex; gap:12px;">
              <input type="text" id="memory-search-input" class="custom-input" placeholder="Query semantic vector DB... (e.g. theme)" />
              <button id="memory-search-btn" class="primary-btn">Query Embeddings</button>
              <button id="memory-clear-btn" class="primary-btn" style="background: rgba(244,63,94,0.1); color: var(--accent-rose); border: 1px solid rgba(244,63,94,0.25);">Reset DB</button>
            </div>
          </div>

          <!-- Memories List -->
          <div class="glass-card" style="flex-grow:1; display:flex; flex-direction:column; overflow:hidden;">
            <h3 style="font-size: 1.1rem; font-weight:600; margin-bottom: 16px;">Memory Nodes Database</h3>
            <div id="memories-list-container" style="flex-grow:1; overflow-y:auto; display:flex; flex-direction:column; gap:12px;">
              <div style="text-align:center; color: var(--text-secondary); margin-top: 40px;">No memory entries found.</div>
            </div>
          </div>
        </div>

        <div class="panel-side">
          <!-- Insert Memory Form -->
          <div class="glass-card" style="display: flex; flex-direction: column; gap: 16px;">
            <h3 style="font-size: 1.1rem; font-weight:600;">Ingest Memory Node</h3>
            
            <div style="display:flex; flex-direction:column; gap:6px;">
              <label style="font-size:0.8rem; color:var(--text-secondary);">Memory Content</label>
              <textarea id="memory-content-input" class="custom-input" style="height:100px; resize:none; font-family:var(--font-sans);" placeholder="Enter content to store..."></textarea>
            </div>

            <div style="display:flex; flex-direction:column; gap:6px;">
              <label style="font-size:0.8rem; color:var(--text-secondary);">Category</label>
              <select id="memory-category-input" class="custom-input" style="background-color: var(--bg-primary);">
                <option value="semantic">Semantic (Long-term Facts)</option>
                <option value="episodic">Episodic (Activity Logs)</option>
                <option value="short-term">Short-term (Active Context)</option>
              </select>
            </div>

            <div style="display:flex; flex-direction:column; gap:6px;">
              <label style="font-size:0.8rem; color:var(--text-secondary);">Tags (comma separated)</label>
              <input type="text" id="memory-tags-input" class="custom-input" placeholder="e.g. system, config" />
            </div>

            <button id="memory-save-btn" class="primary-btn">Commit to VectorDB</button>
          </div>
          
          <div class="glass-card" style="margin-top:auto; font-size:0.85rem; color: var(--text-secondary); line-height: 1.4;">
            The <strong>Memory Module</strong> manages conversational context logs and connects to local key-value stores or vector spaces for semantic semantic search.
          </div>
        </div>
      </div>
    `;
  }

  private attachEvents(): void {
    const searchInput = this.container.querySelector('#memory-search-input') as HTMLInputElement;
    const searchBtn = this.container.querySelector('#memory-search-btn') as HTMLButtonElement;
    const clearBtn = this.container.querySelector('#memory-clear-btn') as HTMLButtonElement;
    
    const contentInput = this.container.querySelector('#memory-content-input') as HTMLTextAreaElement;
    const categoryInput = this.container.querySelector('#memory-category-input') as HTMLSelectElement;
    const tagsInput = this.container.querySelector('#memory-tags-input') as HTMLInputElement;
    const saveBtn = this.container.querySelector('#memory-save-btn') as HTMLButtonElement;

    // Search query
    searchBtn.addEventListener('click', async () => {
      const query = searchInput.value.trim();
      if (!query) {
        this.refreshMemories();
        return;
      }

      try {
        let results = [];
        if ((window as any).astraAPI?.recallMemory) {
          results = await (window as any).astraAPI.recallMemory(query);
        } else {
          // Browser Simulation
          results = [
            {
              id: 'sim_mem',
              timestamp: new Date().toISOString(),
              category: 'semantic',
              content: `[Simulated Recall for "${query}"] Match found in vector index nodes.`,
              tags: ['search-result']
            }
          ];
        }
        this.renderMemoriesList(results);
      } catch (err: any) {
        console.error('Failed search memory:', err);
      }
    });

    // Clear database
    clearBtn.addEventListener('click', async () => {
      try {
        if ((window as any).astraAPI?.clearMemory) {
          await (window as any).astraAPI.clearMemory();
        }
        this.refreshMemories();
      } catch (err: any) {
        console.error(err);
      }
    });

    // Save node
    saveBtn.addEventListener('click', async () => {
      const content = contentInput.value.trim();
      const category = categoryInput.value;
      const tags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t.length > 0);

      if (!content) return;

      try {
        if ((window as any).astraAPI?.storeMemory) {
          await (window as any).astraAPI.storeMemory(content, category, tags);
        } else {
          // Browser Simulation
          console.log(`[Simulated Store] Content: ${content}, Category: ${category}, Tags: ${tags}`);
        }

        // Reset Inputs
        contentInput.value = '';
        tagsInput.value = '';
        this.refreshMemories();
      } catch (err: any) {
        console.error('Failed save memory:', err);
      }
    });
  }

  private async refreshMemories(): Promise<void> {
    try {
      let memoriesList = [];
      if ((window as any).astraAPI?.getMemories) {
        memoriesList = await (window as any).astraAPI.getMemories();
      } else {
        // Browser Simulation
        memoriesList = [
          {
            id: 'mem_1',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            category: 'semantic',
            content: 'User preferences show a preference for Dark/Glassmorphic themes.',
            tags: ['user-profile', 'theme']
          },
          {
            id: 'mem_2',
            timestamp: new Date(Date.now() - 1800000).toISOString(),
            category: 'short-term',
            content: 'System initialized and confirmed empty directory status.',
            tags: ['system-state', 'workspace']
          }
        ];
      }
      this.renderMemoriesList(memoriesList);
    } catch (err: any) {
      console.error(err);
    }
  }

  private renderMemoriesList(memories: any[]): void {
    const container = this.container.querySelector('#memories-list-container') as HTMLDivElement;
    if (memories.length === 0) {
      container.innerHTML = `<div style="text-align:center; color: var(--text-secondary); margin-top: 40px;">No memory entries found.</div>`;
      return;
    }

    container.innerHTML = '';
    memories.forEach(mem => {
      const node = document.createElement('div');
      node.style.background = 'rgba(255, 255, 255, 0.02)';
      node.style.border = '1px solid rgba(255, 255, 255, 0.05)';
      node.style.borderRadius = '8px';
      node.style.padding = '16px';
      node.style.display = 'flex';
      node.style.flexDirection = 'column';
      node.style.gap = '8px';

      let catBadge = '';
      if (mem.category === 'semantic') catBadge = `<span class="status-badge badge-blue">Semantic</span>`;
      else if (mem.category === 'short-term') catBadge = `<span class="status-badge" style="background: rgba(168,85,247,0.12); color: var(--accent-purple); border:1px solid rgba(168,85,247,0.25);">Context</span>`;
      else catBadge = `<span class="status-badge badge-amber">Episodic</span>`;

      node.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>${catBadge}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${new Date(mem.timestamp).toLocaleString()}</div>
        </div>
        <div style="font-size:0.95rem; line-height:1.4;">${mem.content}</div>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          ${mem.tags.map((t: string) => `<span style="font-size:0.75rem; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.05); padding: 2px 6px; border-radius:4px; color:var(--text-secondary);">#${t}</span>`).join('')}
        </div>
      `;
      container.appendChild(node);
    });
  }
}
