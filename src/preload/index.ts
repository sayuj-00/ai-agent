import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('astraAPI', {
  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get-all'),
  updateSettings: (newSettings: any) => ipcRenderer.invoke('settings:update', newSettings),

  // Brain
  queryBrain: (prompt: string, context?: any) => ipcRenderer.invoke('brain:query', prompt, context),
  /** New structured API — returns a typed Intent object */
  processBrain: (input: string) => ipcRenderer.invoke('brain:process', input),

  // Planner
  /** Legacy: create a plan from a plain goal string */
  createPlan: (goal: string, intentAction?: string, parameters?: Record<string, string>) =>
    ipcRenderer.invoke('planner:create-plan', goal, intentAction, parameters),
  /** New: create a plan from a structured Intent (Brain output) */
  createPlanFromIntent: (intent: any) => ipcRenderer.invoke('planner:create-from-intent', intent),
  /** Simulate step execution for the UI (Executor not yet built) */
  runPlanStep: (planId: string, stepId: string) => ipcRenderer.invoke('planner:run-step', planId, stepId),
  /** Retrieve a single plan by ID */
  getPlan: (id: string) => ipcRenderer.invoke('planner:get-plan', id),
  /** List all plans, most-recent first */
  listPlans: () => ipcRenderer.invoke('planner:list-plans'),
  /** Cancel a plan by ID */
  cancelPlan: (id: string) => ipcRenderer.invoke('planner:cancel-plan', id),

  // Memory
  getMemories: () => ipcRenderer.invoke('memory:get-all'),
  storeMemory: (content: string, category: string, tags?: string[]) => ipcRenderer.invoke('memory:store', content, category, tags),
  recallMemory: (query: string) => ipcRenderer.invoke('memory:recall', query),
  clearMemory: () => ipcRenderer.invoke('memory:clear'),

  // Tools — Legacy (backward compat)
  listTools: () => ipcRenderer.invoke('tools:list'),
  executeTool: (name: string, args: any) => ipcRenderer.invoke('tools:execute', name, args),
  // Tools — New dispatch API (Tool Manager clean architecture)
  /** Dispatch a ToolRequest to the correct handler via the Tool Manager */
  dispatchTool: (request: any) => ipcRenderer.invoke('tools:dispatch', request),
  /** Dispatch a PlanStep directly — no need to construct a ToolRequest manually */
  dispatchPlanStep: (planId: string, step: any, params?: any) => ipcRenderer.invoke('tools:dispatch-step', planId, step, params),
  /** List all registered StepType → Handler routing rules */
  listToolRoutes: () => ipcRenderer.invoke('tools:list-routes'),
  /** Check if a StepType has a registered handler */
  canHandleStepType: (stepType: string) => ipcRenderer.invoke('tools:can-handle', stepType),


  // Files
  listFiles: (dirPath: string) => ipcRenderer.invoke('file:list', dirPath),
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('file:write', filePath, content),

  // Vision
  analyzeImage: (imagePath: string) => ipcRenderer.invoke('vision:analyze', imagePath),

  // Voice
  speak: (text: string) => ipcRenderer.invoke('voice:speak', text),
  listen: () => ipcRenderer.invoke('voice:listen'),
  getVoiceStatus: () => ipcRenderer.invoke('voice:status'),

  // Browser
  launchBrowser: (headed?: boolean) => ipcRenderer.invoke('browser:launch', headed),
  navigateBrowser: (url: string) => ipcRenderer.invoke('browser:navigate', url),
  screenshotBrowser: () => ipcRenderer.invoke('browser:screenshot'),
  closeBrowser: () => ipcRenderer.invoke('browser:close'),
  getBrowserStatus: () => ipcRenderer.invoke('browser:status'),

  // Terminal
  executeCommand: (command: string) => ipcRenderer.invoke('terminal:execute', command),

  // Logs
  getLogs: () => ipcRenderer.invoke('logs:get'),
  onLogEvent: (callback: (log: any) => void) => {
    const wrappedCallback = (_event: any, log: any) => callback(log);
    ipcRenderer.on('logs:event', wrappedCallback);
    return () => {
      ipcRenderer.removeListener('logs:event', wrappedCallback);
    };
  }
});
