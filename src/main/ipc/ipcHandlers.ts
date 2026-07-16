import { ipcMain } from 'electron';
import { AppController } from '../controllers/AppController.js';
import { SettingsService } from '../services/SettingsService.js';
import { LogService } from '../services/LogService.js';
import { BrainService } from '../services/BrainService.js';
import type { Intent } from '../brain/domain/Intent.js';
import type { Plan } from '../planner/domain/Plan.js';
import { PlannerService } from '../services/PlannerService.js';
import { MemoryService } from '../services/MemoryService.js';
import { ToolManager } from '../services/ToolManager.js';
import type { ToolRequest } from '../toolmanager/domain/ToolRequest.js';
import { FileManager } from '../services/FileManager.js';
import { VisionService } from '../services/VisionService.js';
import { VoiceService } from '../services/VoiceService.js';
import { BrowserController } from '../controllers/BrowserController.js';
import { TerminalController } from '../controllers/TerminalController.js';

export function registerIpcHandlers(): void {
  const settings = SettingsService.getInstance();
  const logger = LogService.getInstance();
  const brain = BrainService.getInstance();
  const planner = PlannerService.getInstance();
  const memory = MemoryService.getInstance();
  const tools = ToolManager.getInstance();
  const files = FileManager.getInstance();
  const vision = VisionService.getInstance();
  const voice = VoiceService.getInstance();
  const browser = BrowserController.getInstance();
  const terminal = TerminalController.getInstance();

  // Settings
  ipcMain.handle('settings:get-all', () => settings.getAll());
  ipcMain.handle('settings:update', (_, newSettings) => settings.updateAll(newSettings));

  // Brain (AI Model Integration)
  // brain:query — legacy text response for ChatPanel
  ipcMain.handle('brain:query', (_, prompt, context) => brain.query(prompt, context));
  // brain:process — new structured Intent response (clean architecture)
  ipcMain.handle('brain:process', (_, input: string): Promise<Intent> => brain.process(input));

  // Planner
  // Legacy: create plan from plain goal string (PlannerPanel UI)
  ipcMain.handle('planner:create-plan', (_, goal, intentAction?, parameters?) =>
    planner.createPlan(goal, intentAction, parameters)
  );
  // New: create plan from full structured Intent (Brain → Planner path)
  ipcMain.handle('planner:create-from-intent', (_, intent: Intent): Promise<Plan> =>
    planner.createPlanFromIntent(intent)
  );
  // Registry queries
  ipcMain.handle('planner:get-plan',    (_, id: string) => planner.getPlan(id));
  ipcMain.handle('planner:list-plans',  ()              => planner.listPlans());
  ipcMain.handle('planner:cancel-plan', (_, id: string) => planner.cancelPlan(id));
  // UI step simulation (kept for PlannerPanel)
  ipcMain.handle('planner:run-step', (_, planId, stepId) => planner.runStep(planId, stepId));

  // Memory
  ipcMain.handle('memory:get-all', () => memory.getAllMemories());
  ipcMain.handle('memory:store', (_, content, category, tags) => memory.store(content, category, tags));
  ipcMain.handle('memory:recall', (_, query) => memory.recall(query));
  ipcMain.handle('memory:clear', () => memory.clearMemory());

  // Tools
  // Legacy channels (backward compat)
  ipcMain.handle('tools:list',    ()             => tools.listTools());
  ipcMain.handle('tools:execute', (_, name, args) => tools.executeTool(name, args));
  // New dispatch channels (Tool Manager clean architecture)
  ipcMain.handle('tools:dispatch',      (_, request: ToolRequest)                     => tools.dispatch(request));
  ipcMain.handle('tools:dispatch-step', (_, planId: string, step: any, params?: any) => tools.dispatchStep(planId, step, params));
  ipcMain.handle('tools:list-routes',   ()                                            => tools.listRoutes());
  ipcMain.handle('tools:can-handle',    (_, stepType: string)                         => tools.canHandle(stepType));

  // Files
  ipcMain.handle('file:list', (_, dirPath) => files.listFiles(dirPath));
  ipcMain.handle('file:read', (_, filePath) => files.readSecure(filePath));
  ipcMain.handle('file:write', (_, filePath, content) => files.writeSecure(filePath, content));

  // Vision
  ipcMain.handle('vision:analyze', (_, imagePath) => vision.analyzeImage(imagePath));

  // Voice
  ipcMain.handle('voice:speak', (_, text) => voice.speak(text));
  ipcMain.handle('voice:listen', () => voice.listen());
  ipcMain.handle('voice:status', () => voice.getStatus());

  // Browser Control
  ipcMain.handle('browser:launch', (_, headed) => browser.launch(headed));
  ipcMain.handle('browser:navigate', (_, url) => browser.navigate(url));
  ipcMain.handle('browser:screenshot', () => browser.capturePageScreenshot());
  ipcMain.handle('browser:close', () => browser.close());
  ipcMain.handle('browser:status', () => browser.getSessionStatus());

  // Terminal
  ipcMain.handle('terminal:execute', (_, command) => terminal.executeCommand(command));

  // Logs Retrieval
  ipcMain.handle('logs:get', () => logger.getLogs());

  // Set up real-time log event forwarding to UI
  logger.addLogListener((logEntry) => {
    const win = AppController.getInstance().getWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('logs:event', logEntry);
    }
  });
}
