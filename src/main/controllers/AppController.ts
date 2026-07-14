import { BrowserWindow, shell } from 'electron';
import { resolve } from 'path';
import { LogService } from '../services/LogService.js';
import { SettingsService } from '../services/SettingsService.js';
import { BrainService } from '../services/BrainService.js';
import { PlannerService } from '../services/PlannerService.js';
import { MemoryService } from '../services/MemoryService.js';
import { ToolManager } from '../services/ToolManager.js';
import { FileManager } from '../services/FileManager.js';
import { VisionService } from '../services/VisionService.js';
import { VoiceService } from '../services/VoiceService.js';
import { BrowserController } from './BrowserController.js';
import { TerminalController } from './TerminalController.js';
import { registerIpcHandlers } from '../ipc/ipcHandlers.js';

export class AppController {
  private static instance: AppController | null = null;
  private logger = LogService.getInstance();
  private settings = SettingsService.getInstance();
  private mainWindow: BrowserWindow | null = null;

  private constructor() {
    this.logger.info('AppController', 'Application controller constructor called.');
  }

  public static getInstance(): AppController {
    if (!AppController.instance) {
      AppController.instance = new AppController();
    }
    return AppController.instance;
  }

  public initialize(): void {
    this.logger.info('AppController', 'Initializing system components...');

    // Boot up and register all core modules
    try {
      this.logger.info('AppController', 'System boot sequence: Loading core services...');
      BrainService.getInstance();
      PlannerService.getInstance();
      MemoryService.getInstance();
      ToolManager.getInstance();
      FileManager.getInstance();
      VisionService.getInstance();
      VoiceService.getInstance();
      BrowserController.getInstance();
      TerminalController.getInstance();
      this.logger.info('AppController', 'All system modules loaded successfully.');

      // Setup IPC bindings
      registerIpcHandlers();
      this.logger.info('AppController', 'IPC channels mapped successfully.');

      // Create window
      this.createWindow();
    } catch (error: any) {
      this.logger.error('AppController', `Failed during initialization: ${error.message}`);
    }
  }

  private createWindow(): void {
    if (this.mainWindow) {
      this.mainWindow.focus();
      return;
    }

    this.logger.info('AppController', 'Creating main window container...');
    const theme = this.settings.get('theme');

    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 900,
      minHeight: 650,
      title: 'Astra AI Desktop Assistant',
      frame: true, // Use default framing for stability
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: resolve(__dirname, '../../preload/index.js')
      }
    });

    // Handle external links safely
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    // In dev mode, load Vite server or static file
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
      this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(resolve(__dirname, '../../renderer/index.html'));
    }

    this.mainWindow.once('ready-to-show', () => {
      this.logger.info('AppController', 'Main window frame ready. Displaying UI container.');
      this.mainWindow?.show();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
      this.logger.info('AppController', 'Window instance reference disposed.');
    });
  }

  public quit(): void {
    this.logger.info('AppController', 'Application shutdown request triggered. Exiting processes.');
    // Perform cleanup for sub-processes
    TerminalController.getInstance().cleanup();
    BrowserController.getInstance().cleanup();
    process.exit(0);
  }

  public getWindow(): BrowserWindow | null {
    return this.mainWindow;
  }
}
