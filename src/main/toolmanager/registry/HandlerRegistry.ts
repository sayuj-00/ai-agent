/**
 * Tool Manager — HandlerRegistry
 *
 * A pure lookup table: StepType → IToolHandler.
 * No logic, no decisions — only registration and resolution.
 *
 * Rules:
 *  - One handler per StepType (last registration wins for a given type).
 *  - Handlers declare which types they support via IToolHandler.supportedTypes.
 *  - DispatchUseCase calls resolve() and receives either a handler or undefined.
 */

import type { IToolHandler } from '../domain/IToolHandler.js';
import type { StepType } from '../../planner/domain/Plan.js';

export class HandlerRegistry {
  /** Internal map: StepType → IToolHandler */
  private readonly handlerMap = new Map<StepType, IToolHandler>();

  /**
   * Register a handler for all its declared StepTypes.
   * If a type is already registered, it is overwritten.
   */
  public register(handler: IToolHandler): void {
    for (const type of handler.supportedTypes) {
      this.handlerMap.set(type, handler);
    }
  }

  /**
   * Resolve the handler for a given StepType.
   * Returns undefined if no handler is registered for that type.
   */
  public resolve(stepType: StepType): IToolHandler | undefined {
    return this.handlerMap.get(stepType);
  }

  /** List all registered type→handler mappings (for logging/UI). */
  public listRegistered(): Array<{ type: StepType; handlerName: string }> {
    return [...this.handlerMap.entries()].map(([type, handler]) => ({
      type,
      handlerName: handler.name,
    }));
  }

  /** Check if a given StepType has a registered handler. */
  public has(stepType: StepType): boolean {
    return this.handlerMap.has(stepType);
  }
}
