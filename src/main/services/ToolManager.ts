import { LogService } from './LogService.js';

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  description: string;
  required: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameter[];
}

export class ToolManager {
  private static instance: ToolManager | null = null;
  private logger = LogService.getInstance();
  private tools = new Map<string, ToolDefinition>();

  private constructor() {
    this.logger.info('ToolManager', 'Tool Manager system initialized.');
    this.registerDefaultTools();
  }

  public static getInstance(): ToolManager {
    if (!ToolManager.instance) {
      ToolManager.instance = new ToolManager();
    }
    return ToolManager.instance;
  }

  private registerDefaultTools(): void {
    this.register({
      name: 'web_search',
      description: 'Search the web for queries using a search engine.',
      parameters: [
        { name: 'query', type: 'string', description: 'Search term', required: true }
      ]
    });

    this.register({
      name: 'read_file',
      description: 'Read the contents of a local file.',
      parameters: [
        { name: 'path', type: 'string', description: 'Absolute file path', required: true }
      ]
    });

    this.register({
      name: 'run_command',
      description: 'Executes a command inside the safe terminal.',
      parameters: [
        { name: 'command', type: 'string', description: 'Shell command string', required: true }
      ]
    });
  }

  public register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
    this.logger.info('ToolManager', `Successfully registered tool: "${tool.name}"`);
  }

  public listTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  public async executeTool(name: string, args: any): Promise<any> {
    this.logger.info('ToolManager', `Attempting execution of tool "${name}" with args: ${JSON.stringify(args)}`);
    
    const tool = this.tools.get(name);
    if (!tool) {
      this.logger.error('ToolManager', `Execution failed: Tool "${name}" is not registered.`);
      throw new Error(`Tool "${name}" is not registered.`);
    }

    // Check required parameters
    for (const param of tool.parameters) {
      if (param.required && args[param.name] === undefined) {
        this.logger.error('ToolManager', `Execution failed: Missing required argument "${param.name}".`);
        throw new Error(`Missing required argument "${param.name}".`);
      }
    }

    // Simulate tool running
    await new Promise(resolve => setTimeout(resolve, 600));

    this.logger.info('ToolManager', `Tool "${name}" execution completed successfully.`);
    return {
      success: true,
      data: `Simulated output from tool "${name}".`
    };
  }
}
