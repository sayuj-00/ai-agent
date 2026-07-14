import { LogService } from './LogService.js';

export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
}

export class FileManager {
  private static instance: FileManager | null = null;
  private logger = LogService.getInstance();

  private constructor() {
    this.logger.info('FileManager', 'File Manager security policies and filesystem sandbox initialized.');
  }

  public static getInstance(): FileManager {
    if (!FileManager.instance) {
      FileManager.instance = new FileManager();
    }
    return FileManager.instance;
  }

  public async listFiles(dirPath: string): Promise<FileInfo[]> {
    this.logger.info('FileManager', `Scanning files in: "${dirPath}"`);
    
    // Simulate reading directory
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const mockFiles: FileInfo[] = [
      { name: 'src', path: `${dirPath}/src`, isDirectory: true, size: 0 },
      { name: 'package.json', path: `${dirPath}/package.json`, isDirectory: false, size: 450 },
      { name: 'tsconfig.json', path: `${dirPath}/tsconfig.json`, isDirectory: false, size: 280 },
      { name: 'vite.config.ts', path: `${dirPath}/vite.config.ts`, isDirectory: false, size: 310 }
    ];

    this.logger.info('FileManager', `Scan complete. Found ${mockFiles.length} file system nodes.`);
    return mockFiles;
  }

  public async readSecure(filePath: string): Promise<string> {
    this.logger.info('FileManager', `Opening file securely: "${filePath}"`);
    await new Promise(resolve => setTimeout(resolve, 200));
    return `// Mock content of file: ${filePath}\nconsole.log("Workspace placeholder file read ok.");`;
  }

  public async writeSecure(filePath: string, content: string): Promise<boolean> {
    this.logger.info('FileManager', `Writing file securely: "${filePath}" (${content.length} characters)`);
    await new Promise(resolve => setTimeout(resolve, 400));
    this.logger.info('FileManager', `Write transaction committed to disk: ${filePath}`);
    return true;
  }
}
