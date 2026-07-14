import { LogService } from './LogService.js';

export interface MemoryNode {
  id: string;
  timestamp: string;
  category: 'short-term' | 'episodic' | 'semantic';
  content: string;
  tags: string[];
}

export class MemoryService {
  private static instance: MemoryService | null = null;
  private logger = LogService.getInstance();
  private memories: MemoryNode[] = [];

  private constructor() {
    this.logger.info('MemoryService', 'Agent memory database initialized.');
    this.seedMockMemories();
  }

  public static getInstance(): MemoryService {
    if (!MemoryService.instance) {
      MemoryService.instance = new MemoryService();
    }
    return MemoryService.instance;
  }

  private seedMockMemories(): void {
    this.memories.push(
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
    );
  }

  public async store(content: string, category: MemoryNode['category'], tags: string[] = []): Promise<MemoryNode> {
    const node: MemoryNode = {
      id: `mem_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      category,
      content,
      tags
    };

    this.memories.push(node);
    this.logger.info('MemoryService', `Stored new memory node (ID: ${node.id}) in category "${category}"`);
    return node;
  }

  public async recall(query: string): Promise<MemoryNode[]> {
    this.logger.info('MemoryService', `Recalling memory nodes relevant to query: "${query}"`);
    
    // Simple mock filter based on tag matches or content search
    const lowerQuery = query.toLowerCase();
    const matches = this.memories.filter(
      m => m.content.toLowerCase().includes(lowerQuery) || m.tags.some(t => t.toLowerCase().includes(lowerQuery))
    );

    this.logger.info('MemoryService', `Retrieved ${matches.length} matching nodes.`);
    return matches;
  }

  public async getAllMemories(): Promise<MemoryNode[]> {
    return [...this.memories];
  }

  public async clearMemory(): Promise<void> {
    this.memories = [];
    this.logger.info('MemoryService', 'All memory nodes have been cleared.');
  }
}
