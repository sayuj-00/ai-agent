import { app } from 'electron';
import { AppController } from './controllers/AppController.js';
import { LogService } from './services/LogService.js';

const logger = LogService.getInstance();

// Prevent multiple instances of the app running simultaneously
if (!app.requestSingleInstanceLock()) {
  logger.warn('Main', 'Another instance of Astra AI is already running. Quitting.');
  app.quit();
} else {
  // Initialize the main application controller
  const appController = AppController.getInstance();

  app.on('ready', () => {
    logger.info('Main', 'Electron application ready. Launching AppController...');
    appController.initialize();
  });

  app.on('window-all-closed', () => {
    logger.info('Main', 'All windows closed.');
    if (process.platform !== 'darwin') {
      appController.quit();
    }
  });

  app.on('activate', () => {
    logger.info('Main', 'Application activated.');
    // Re-create window if necessary (macOS standard)
    appController.initialize();
  });
}
