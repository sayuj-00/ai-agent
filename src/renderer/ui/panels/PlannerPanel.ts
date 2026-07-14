export class PlannerPanel {
  private container: HTMLDivElement;
  private activePlan: any = null;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) as HTMLDivElement;
    this.render();
    this.attachEvents();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="view-title">System Activity Monitor</div>
      <div class="view-description">Orchestrate complex execution graphs and track hardware resource schedules.</div>
      
      <div class="panel-grid">
        <div class="panel-main">
          <!-- Objective settings card -->
          <div class="glass-card" style="margin-bottom: 20px;">
            <h3 style="font-size: 1rem; font-weight:700; margin-bottom: 12px; color: #ffffff;">Formulate Execution Graph</h3>
            <div class="input-group">
              <input type="text" id="goal-input" class="custom-input" placeholder="e.g. Set up a secure microservice backend..." />
              <button id="plan-btn" class="primary-btn">Compile Plan</button>
            </div>
          </div>

          <!-- Execution steps list card -->
          <div class="glass-card" style="flex-grow: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 250px;">
            <h3 style="font-size: 1rem; font-weight:700; margin-bottom: 16px; color:#ffffff;">Active Subprocesses</h3>
            <div id="plan-steps-container" style="flex-grow:1; display:flex; flex-direction:column; gap:12px; overflow-y:auto; justify-content:center; align-items:center; color: var(--text-secondary)">
              Submit a goal above to partition task executions.
            </div>
            <div class="input-group" style="justify-content: flex-end; margin-top: 16px;">
              <button id="run-plan-btn" class="primary-btn active-pulse" style="display:none;">Execute Sequence</button>
            </div>
          </div>
        </div>

        <div class="panel-side">
          <!-- OS Hardware usage widgets -->
          <div class="glass-card" style="display: flex; flex-direction: column; gap: 20px; height: 100%;">
            <h3 style="font-size: 1rem; font-weight:700; color:#ffffff;">System Status</h3>
            
            <div style="display:flex; flex-direction:column; gap:6px;">
              <span style="font-size: 0.75rem; color: var(--text-muted); font-weight:700; text-transform:uppercase;">Planner State</span>
              <div style="font-weight: 700; font-size: 1.1rem; color: var(--accent-cyan);" id="planner-state-badge">IDLE</div>
            </div>

            <!-- CPU visualizer bar -->
            <div style="display:flex; flex-direction:column; gap:8px;">
              <div style="display:flex; justify-content:space-between; font-size:0.8rem;">
                <span style="color:var(--text-secondary);">CPU Util</span>
                <span style="color:var(--accent-cyan); font-weight:600;" id="cpu-util-val">12%</span>
              </div>
              <div style="height:6px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden;">
                <div style="width:12%; height:100%; background:var(--gradient-accent); transition: width 0.5s ease;" id="cpu-util-bar"></div>
              </div>
            </div>

            <!-- Memory visualizer bar -->
            <div style="display:flex; flex-direction:column; gap:8px;">
              <div style="display:flex; justify-content:space-between; font-size:0.8rem;">
                <span style="color:var(--text-secondary);">Memory Allocated</span>
                <span style="color:var(--accent-cyan); font-weight:600;" id="mem-util-val">35%</span>
              </div>
              <div style="height:6px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden;">
                <div style="width:35%; height:100%; background:var(--gradient-accent); transition: width 0.5s ease;" id="mem-util-bar"></div>
              </div>
            </div>

            <div>
              <span style="font-size: 0.75rem; color: var(--text-muted); font-weight:700; text-transform:uppercase;">Scheduling Service</span>
              <div style="font-weight: 500; font-size: 0.85rem; margin-top: 4px; color: var(--accent-purple); font-family: var(--font-mono);">PlannerService.ts</div>
            </div>

            <div style="margin-top:auto; font-size:0.8rem; color: var(--text-secondary); line-height: 1.4;">
              System resources shift workloads dynamically as task sequences iterate across backend threads execution routines.
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private attachEvents(): void {
    const goalInput = this.container.querySelector('#goal-input') as HTMLInputElement;
    const planBtn = this.container.querySelector('#plan-btn') as HTMLButtonElement;
    const stepsContainer = this.container.querySelector('#plan-steps-container') as HTMLDivElement;
    const runBtn = this.container.querySelector('#run-plan-btn') as HTMLButtonElement;
    
    const stateBadge = this.container.querySelector('#planner-state-badge') as HTMLDivElement;
    const cpuBar = this.container.querySelector('#cpu-util-bar') as HTMLDivElement;
    const cpuVal = this.container.querySelector('#cpu-util-val') as HTMLSpanElement;
    const memBar = this.container.querySelector('#mem-util-bar') as HTMLDivElement;
    const memVal = this.container.querySelector('#mem-util-val') as HTMLSpanElement;

    planBtn.addEventListener('click', async () => {
      const goal = goalInput.value.trim();
      if (!goal) return;

      stepsContainer.innerHTML = '<div style="color: var(--text-secondary);">Analyzing objectives and generating steps...</div>';
      stateBadge.innerText = 'COMPILING GRAPH';
      stateBadge.style.color = 'var(--accent-cyan)';
      
      // Update visual OS metrics load
      this.updateMetrics(38, 48, cpuBar, cpuVal, memBar, memVal);

      try {
        if ((window as any).astraAPI?.createPlan) {
          this.activePlan = await (window as any).astraAPI.createPlan(goal);
        } else {
          // Browser Simulation
          await new Promise(resolve => setTimeout(resolve, 800));
          this.activePlan = {
            id: 'mock_plan_id',
            goal,
            status: 'pending',
            steps: [
              { id: '1', task: 'Scan and index project directories', status: 'pending' },
              { id: '2', task: 'Analyze files and design interface bindings', status: 'pending' },
              { id: '3', task: 'Execute code generation task', status: 'pending' },
              { id: '4', task: 'Run verification tests and audit logs', status: 'pending' }
            ]
          };
        }

        this.renderSteps();
        runBtn.style.display = 'block';
        stateBadge.innerText = 'GRAPH READY';
        stateBadge.style.color = 'var(--accent-amber)';
      } catch (err: any) {
        stepsContainer.innerText = `Failed to create plan: ${err.message}`;
        stateBadge.innerText = 'ERROR';
        stateBadge.style.color = 'var(--accent-rose)';
      }
    });

    runBtn.addEventListener('click', async () => {
      if (!this.activePlan) return;
      
      runBtn.disabled = true;
      runBtn.innerText = 'Executing Graph...';
      stateBadge.innerText = 'PROCESSING';
      stateBadge.style.color = 'var(--accent-cyan)';

      try {
        for (const step of this.activePlan.steps) {
          step.status = 'running';
          this.renderSteps();
          
          // Boost hardware monitoring loads visually
          const randomCpu = Math.floor(Math.random() * 30) + 55;
          const randomMem = Math.floor(Math.random() * 10) + 50;
          this.updateMetrics(randomCpu, randomMem, cpuBar, cpuVal, memBar, memVal);

          if ((window as any).astraAPI?.runPlanStep) {
            this.activePlan = await (window as any).astraAPI.runPlanStep(this.activePlan.id, step.id);
          } else {
            // Browser Simulation
            await new Promise(resolve => setTimeout(resolve, 1000));
            step.status = 'completed';
            step.result = `Successfully performed task: ${step.task}`;
          }
        }

        this.activePlan.status = 'completed';
        this.renderSteps();
        runBtn.style.display = 'none';
        stateBadge.innerText = 'GRAPH RESOLVED';
        stateBadge.style.color = 'var(--accent-green)';
        
        // Return resource load back to normal
        this.updateMetrics(14, 37, cpuBar, cpuVal, memBar, memVal);
      } catch (err: any) {
        stateBadge.innerText = 'FAILED';
        stateBadge.style.color = 'var(--accent-rose)';
        runBtn.disabled = false;
        runBtn.innerText = 'Resume Graph';
      }
    });
  }

  private updateMetrics(cpu: number, mem: number, cpuBar: HTMLDivElement, cpuVal: HTMLSpanElement, memBar: HTMLDivElement, memVal: HTMLSpanElement) {
    if (cpuBar) cpuBar.style.width = `${cpu}%`;
    if (cpuVal) cpuVal.innerText = `${cpu}%`;
    if (memBar) memBar.style.width = `${mem}%`;
    if (memVal) memVal.innerText = `${mem}%`;

    // Apply header telemetry syncs
    const globalCpu = document.getElementById('cpu-telemetry');
    const globalMem = document.getElementById('mem-telemetry');
    if (globalCpu) globalCpu.innerText = `${cpu}%`;
    if (globalMem) globalMem.innerText = `${(4.0 + (mem/50)).toFixed(1)} GB`;
  }

  private renderSteps(): void {
    const stepsContainer = this.container.querySelector('#plan-steps-container') as HTMLDivElement;
    if (!this.activePlan) return;

    stepsContainer.innerHTML = '';
    stepsContainer.style.justifyContent = 'flex-start';
    stepsContainer.style.alignItems = 'stretch';

    this.activePlan.steps.forEach((step: any) => {
      const card = document.createElement('div');
      card.style.display = 'flex';
      card.style.alignItems = 'center';
      card.style.justifyContent = 'space-between';
      card.style.background = 'rgba(255, 255, 255, 0.02)';
      card.style.border = '1px solid rgba(255, 255, 255, 0.05)';
      card.style.borderRadius = '10px';
      card.style.padding = '12px 16px';

      let statusHtml = '';
      if (step.status === 'pending') {
        statusHtml = `<span class="status-badge" style="background: rgba(100,116,139,0.1); color: var(--text-muted); border: 1px solid rgba(100,116,139,0.2);">Pending</span>`;
      } else if (step.status === 'running') {
        statusHtml = `<span class="status-badge" style="background: rgba(56,189,248,0.12); color: var(--accent-cyan); border: 1px solid rgba(56,189,248,0.25);">Running</span>`;
        card.style.borderColor = 'rgba(56,189,248,0.25)';
        card.style.background = 'rgba(56,189,248,0.01)';
      } else if (step.status === 'completed') {
        statusHtml = `<span class="status-badge badge-green">Done</span>`;
      }

      card.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:4px;">
          <div style="font-weight: 500; font-size:0.9rem;">${step.task}</div>
          ${step.result ? `<div style="font-size:0.75rem; color:var(--text-secondary);">${step.result}</div>` : ''}
        </div>
        <div>${statusHtml}</div>
      `;

      stepsContainer.appendChild(card);
    });
  }
}
