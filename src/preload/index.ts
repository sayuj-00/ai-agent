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


  // Files — Legacy (backward compat)
  listFiles: (dirPath: string) => ipcRenderer.invoke('file:list', dirPath),
  readFile:  (filePath: string) => ipcRenderer.invoke('file:read', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('file:write', filePath, content),
  // Files — Full File Manager API
  /** Read a file and get full metadata + content */
  readFileFull:  (filePath: string) => ipcRenderer.invoke('file:read-full', filePath),
  /** List directory entries with full metadata */
  listFilesFull: (dirPath: string, recursive?: boolean) => ipcRenderer.invoke('file:list-full', dirPath, recursive),
  /** Write text to a file (creates parent dirs automatically) */
  writeFileFull: (filePath: string, content: string, overwrite?: boolean) => ipcRenderer.invoke('file:write-full', filePath, content, overwrite),
  /** Get metadata for a single path */
  statFile: (targetPath: string) => ipcRenderer.invoke('file:stat', targetPath),
  /** Search for files by name or content */
  searchFiles: (rootPath: string, query: string, inContent?: boolean, ext?: string, recursive?: boolean, max?: number) =>
    ipcRenderer.invoke('file:search', rootPath, query, inContent, ext, recursive, max),
  /** Create a directory (and all parent dirs) */
  createFolder: (dirPath: string) => ipcRenderer.invoke('file:create-folder', dirPath),
  /** Rename a file or directory */
  renameFile: (filePath: string, newName: string) => ipcRenderer.invoke('file:rename', filePath, newName),
  /** Delete a file or directory */
  deleteFile: (targetPath: string) => ipcRenderer.invoke('file:delete', targetPath),
  /** Copy a file or directory */
  copyFile: (sourcePath: string, destinationPath: string, overwrite?: boolean) =>
    ipcRenderer.invoke('file:copy', sourcePath, destinationPath, overwrite),
  /** Move a file or directory */
  moveFile: (sourcePath: string, destinationPath: string, overwrite?: boolean) =>
    ipcRenderer.invoke('file:move', sourcePath, destinationPath, overwrite),


  // Vision — Legacy (backward compat)
  analyzeImage: (imagePath: string) => ipcRenderer.invoke('vision:analyze', imagePath),
  // Vision — Full structured API
  /** Take a real screenshot of the primary display */
  captureScreen: () => ipcRenderer.invoke('vision:capture'),
  /** Capture screen and return layout analysis + OCR text in one step */
  analyzeCurrentScreen: () => ipcRenderer.invoke('vision:analyze-current'),
  /** Perform OCR on a given image file */
  runOcr: (imagePath: string) => ipcRenderer.invoke('vision:ocr', imagePath),


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

  // Terminal — Legacy (backward compat)
  executeCommand: (command: string) => ipcRenderer.invoke('terminal:execute', command),
  // Terminal — Full structured API
  /** Execute a command and get a full structured CommandResult */
  runCommand: (command: string, options?: any) => ipcRenderer.invoke('terminal:run', command, options),
  /** List all terminal sessions */
  getTerminalSessions: () => ipcRenderer.invoke('terminal:sessions'),
  /** Get a specific session by ID */
  getTerminalSession: (sessionId: string) => ipcRenderer.invoke('terminal:session', sessionId),
  /** Cancel a running command by session ID */
  cancelCommand: (sessionId: string) => ipcRenderer.invoke('terminal:cancel', sessionId),
  /** Cancel all running commands */
  cancelAllCommands: () => ipcRenderer.invoke('terminal:cancel-all'),
  /** Clear completed session history */
  clearTerminalHistory: () => ipcRenderer.invoke('terminal:clear'),
  /** Get execution stats (success rate, totals) */
  getTerminalStats: () => ipcRenderer.invoke('terminal:stats'),
  /** Get the shell name being used (e.g. "PowerShell") */
  getShellName: () => ipcRenderer.invoke('terminal:shell'),



  // Application Control
  launchApp: (appNameOrPath: string, args?: string[]) => ipcRenderer.invoke('app:launch', appNameOrPath, args),
  closeApp: (identifier: number | string) => ipcRenderer.invoke('app:close', identifier),
  switchAppWindow: (identifier: number | string) => ipcRenderer.invoke('app:switch-window', identifier),
  detectRunningApps: () => ipcRenderer.invoke('app:detect'),


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
