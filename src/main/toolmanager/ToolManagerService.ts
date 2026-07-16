/**
 * Tool Manager Module — ToolManagerService (Public Facade)
 *
 * Single public entry point for the entire Tool Manager module.
 * Wires the dependency graph and exposes a minimal, clean API.
 *
 * Dependency graph (wired here):
 *
 *   ToolManagerService
 *     └── DispatchUseCase              (application layer)
 *           └── HandlerRegistry        (lookup table)
 *                 ├── BrowserHandler   → BrowserController
 *                 ├── TerminalHandler  → TerminalController
 *                 ├── FileSystemHandler→ FileManager
 *                 ├── MemoryHandler    → MemoryService
 *                 ├── VisionHandler    → VisionService
 *                 ├── VoiceHandler     → VoiceService
 *                 └── ApplicationHandler (analysis/output steps)
 *
 * Callers only import ToolManagerService — never individual handlers.
 */

import { LogService } from '../services/LogService.js';
import { HandlerRegistry } from './registry/HandlerRegistry.js';
import { DispatchUseCase } from './application/DispatchUseCase.js';
import { BrowserHandler } from './handlers/BrowserHandler.js';
import { TerminalHandler } from './handlers/TerminalHandler.js';
import { FileSystemHandler } from './handlers/FileSystemHandler.js';
import { MemoryHandler } from './handlers/MemoryHandler.js';
import { VisionHandler } from './handlers/VisionHandler.js';
import { VoiceHandler } from './handlers/VoiceHandler.js';
import { ApplicationHandler } from './handlers/ApplicationHandler.js';
import type { IToolHandler } from './domain/IToolHandler.js';
import type { ToolRequest } from './domain/ToolRequest.js';
import type { ToolResult } from './domain/ToolResult.js';
import type { PlanStep } from '../planner/domain/Plan.js';

// Re-export all public types — single import point for callers
export type { ToolRequest } from './domain/ToolRequest.js';
export type { ToolResult, ToolResultStatus } from './domain/ToolResult.js';
export type { IToolHandler } from './domain/IToolHandler.js';

export class ToolManagerService {
  private static instance: ToolManagerService | null = null;

  private readonly registry: HandlerRegistry;
  private readonly useCase: DispatchUseCase;
  private readonly logger = LogService.getInstance();

  private constructor() {
    this.registry = new HandlerRegistry();
    this.registerDefaultHandlers();
    this.useCase = new DispatchUseCase(this.registry);

    const routes = this.registry.listRegistered();
    this.logger.info('ToolManager', 'Tool Manager initialized (clean architecture).');
    this.logger.info('ToolManager', `Routing table (${routes.length} rules):`);
    for (const r of routes) {
      this.logger.info('ToolManager', `  ${r.type.padEnd(14)} → ${r.handlerName}`);
    }
  }

  public static getInstance(): ToolManagerService {
    if (!ToolManagerService.instance) {
      ToolManagerService.instance = new ToolManagerService();
    }
    return ToolManagerService.instance;
  }

  // ---------------------------------------------------------------------------
  // Handler registration
  // ---------------------------------------------------------------------------

  private registerDefaultHandlers(): void {
    this.registry.register(new BrowserHandler());
    this.registry.register(new TerminalHandler());
    this.registry.register(new FileSystemHandler());
    this.registry.register(new MemoryHandler());
    this.registry.register(new VisionHandler());
    this.registry.register(new VoiceHandler());
    this.registry.register(new ApplicationHandler());
  }

  /**
   * Register a custom handler at runtime.
   * The handler declares which StepTypes it handles via supportedTypes.
   */
  public registerHandler(handler: IToolHandler): void {
    this.registry.register(handler);
    this.logger.info(
      'ToolManager',
      `Custom handler registered: ${handler.name} → [${handler.supportedTypes.join(', ')}]`
    );
  }

  // ---------------------------------------------------------------------------
  // Primary dispatch API
  // ---------------------------------------------------------------------------

  /**
   * Dispatch a ToolRequest to the correct handler.
   * This is the main entry point — called by the Planner's ExecutorAdapter.
   */
  public async dispatch(request: ToolRequest): Promise<ToolResult> {
    this.logger.info(
      'ToolManager',
      `▶ Dispatch [${request.stepType}] "${request.label}" ` +
      `(step=${request.stepId}, plan=${request.planId})`
    );

    const result = await this.useCase.dispatch(request);

    const icon = result.status === 'success' ? '✔' : result.status === 'not_implemented' ? '⚠' : '✖';
    this.logger.info(
      'ToolManager',
      `${icon} [${request.stepType}] "${request.label}" → ` +
      `${result.handlerName} | ${result.durationMs}ms | status=${result.status}`
    );

    return result;
  }

  /**
   * Convenience: dispatch a PlanStep directly (no manual ToolRequest construction).
   * Called by the Planner's ExecutorAdapter when running each step.
   */
  public async dispatchStep(
    planId: string,
    step: PlanStep,
    extraParameters?: Record<string, string>
  ): Promise<ToolResult> {
    const request: ToolRequest = {
      stepId:      step.id,
      planId,
      stepType:    step.type,
      label:       step.label,
      description: step.description,
      parameters:  { ...extraParameters },
    };
    return this.dispatch(request);
  }

  // ---------------------------------------------------------------------------
  // Registry introspection
  // ---------------------------------------------------------------------------

  /** List all registered routing rules — used by the UI (ToolsPanel). */
  public listRoutes(): Array<{ type: string; handlerName: string }> {
    return this.registry.listRegistered();
  }

  /** Check if a step type has a registered handler. */
  public canHandle(stepType: string): boolean {
    return this.registry.has(stepType as any);
  }

  // ---------------------------------------------------------------------------
  // Legacy backward-compat API (existing IPC channels: tools:list, tools:execute)
  // ---------------------------------------------------------------------------

  /** @deprecated Use listRoutes() instead */
  public listTools(): Array<{ name: string; description: string; parameters: any[] }> {
    return this.registry.listRegistered().map(r => ({
      name:        r.type,
      description: `Routes "${r.type}" steps → ${r.handlerName}`,
      parameters:  [],
    }));
  }

  /** @deprecated Use dispatch() instead */
  public async executeTool(name: string, args: Record<string, string> = {}): Promise<any> {
    const request: ToolRequest = {
      stepId:      `manual_${Date.now()}`,
      planId:      'manual',
      stepType:    name as any,
      label:       `Manual: ${name}`,
      description: `Manual tool execution: ${name}`,
      parameters:  args,
    };
    return this.dispatch(request);
  }
}
