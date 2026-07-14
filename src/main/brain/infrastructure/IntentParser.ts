/**
 * Brain Infrastructure — IntentParser
 *
 * Classifies a raw natural language string into a structured intent.
 * Uses a priority-ordered rule set of regex patterns.
 *
 * Design:
 *  - Each rule maps a set of patterns to an IntentAction + base confidence.
 *  - Rules are evaluated top-down; the first match wins.
 *  - More specific actions have higher priority over generic ones.
 *  - Slot extraction pulls structured parameters from the input text.
 *
 * This component is the only infrastructure piece inside the Brain module
 * because it does NOT depend on any external service. It is pure computation.
 *
 * To upgrade to an LLM-backed parser later, simply replace this class with
 * a different implementation — BrainUseCase will not change at all.
 */

import type { IntentAction } from '../domain/Intent.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedIntent {
  action: IntentAction;
  confidence: number;
  parameters: Record<string, string>;
}

interface PatternRule {
  action: IntentAction;
  /** Base confidence when this rule fires (before adjustment). */
  baseConfidence: number;
  patterns: RegExp[];
}

// ---------------------------------------------------------------------------
// IntentParser
// ---------------------------------------------------------------------------

export class IntentParser {
  /**
   * Ordered rule table — evaluated top-down, first match wins.
   * More specific/high-signal patterns are placed first.
   */
  private readonly rules: PatternRule[] = [
    // --- Vision / image analysis ---
    {
      action: 'analyze_image',
      baseConfidence: 0.92,
      patterns: [
        /\b(analyze|describe|identify|caption|ocr|extract text from)\b.{0,30}\b(image|photo|screenshot|picture|picture|jpg|png|gif)\b/i,
        /\b(what('?s| is) in (the|this|my))\b.{0,20}\b(image|photo|screenshot|picture)\b/i,
        /\b(vision|look at (this|the) (image|photo|screenshot))\b/i,
      ]
    },

    // --- Terminal / shell command ---
    {
      action: 'run_command',
      baseConfidence: 0.91,
      patterns: [
        /\b(run|execute|terminal|bash|cmd|powershell|shell)\b.{0,20}\b(command|script|process)\b/i,
        /\b(run|exec|execute)\s+(ls|dir|cd|git|npm|node|python|pip|docker|kubectl|curl)\b/i,
        /\bopen (a )?(new )?(terminal|shell|cmd|powershell|command prompt)\b/i,
        /\b(kill|start|stop|restart)\s+(process|service|server|daemon)\b/i,
      ]
    },

    // --- Web browsing / automation ---
    {
      action: 'browse_web',
      baseConfidence: 0.91,
      patterns: [
        /\b(browse|navigate|open|visit|go to|load)\b.{0,30}\b(website|url|webpage|http|www|site)\b/i,
        /https?:\/\/[^\s]+/i,
        /\bopen\s+(https?:\/\/|www\.)\S+/i,
        /\b(google|search online for|look up online)\b/i,
        /\bscroll|click|type into\b.{0,20}\b(page|website|browser)\b/i,
      ]
    },

    // --- File operations ---
    {
      action: 'file_op',
      baseConfidence: 0.90,
      patterns: [
        /\b(read|write|open|save|create|delete|rename|move|copy|list|show)\b.{0,30}\b(file|files|folder|directory|dir)\b/i,
        /\b(file|folder|directory)\b.{0,30}\b(read|write|open|save|create|delete|rename)\b/i,
        /\b(show me|list|display)\b.{0,10}\b(files|folders|contents of)\b/i,
        /\.(txt|json|csv|md|ts|js|py|html|css|log|xml|yaml|yml)\b/i,
      ]
    },

    // --- Memory: store ---
    {
      action: 'remember',
      baseConfidence: 0.93,
      patterns: [
        /\b(remember|store|save|keep in mind|note that|memorize|don't forget|log that)\b/i,
        /\b(add to memory|save this|keep this)\b/i,
      ]
    },

    // --- Memory: retrieve ---
    {
      action: 'recall',
      baseConfidence: 0.93,
      patterns: [
        /\b(recall|retrieve|what did (i|you)|remind me|forget|look in memory)\b/i,
        /\b(what do (i|you) know about|do (i|you) remember)\b/i,
        /\bfrom (my |the )?memory\b/i,
      ]
    },

    // --- Search / research ---
    {
      action: 'search',
      baseConfidence: 0.85,
      patterns: [
        /\b(search for|look up|find information|research|what is|who is|where is|when did|why did|how (do|does|to|can))\b/i,
        /\b(tell me about|explain|define|summarize|overview of)\b/i,
        /\b(latest|recent|current|news about)\b/i,
      ]
    },

    // --- Multi-step task execution ---
    {
      action: 'execute_task',
      baseConfidence: 0.82,
      patterns: [
        /\b(create|build|make|generate|write|develop|implement|code|refactor|fix|debug|deploy|set up|scaffold)\b/i,
        /\b(design|plan|architect|restructure|migrate|convert|transform)\b/i,
        /\b(step by step|automate|batch|pipeline)\b/i,
      ]
    },

    // --- General chat (fallback — always matches) ---
    {
      action: 'chat',
      baseConfidence: 0.55,
      patterns: [/.+/]
    }
  ];

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Classifies the input string and extracts parameter slots.
   * Returns action='unknown' only when input is empty.
   */
  public parse(input: string): ParsedIntent {
    const trimmed = input.trim();

    if (!trimmed) {
      return { action: 'unknown', confidence: 0.0, parameters: {} };
    }

    for (const rule of this.rules) {
      for (const pattern of rule.patterns) {
        if (pattern.test(trimmed)) {
          const confidence = this.adjustConfidence(rule.baseConfidence, trimmed, rule.action);
          const parameters = this.extractSlots(trimmed, rule.action);
          return { action: rule.action, confidence, parameters };
        }
      }
    }

    // Should never reach here because 'chat' rule has .+ fallback
    return { action: 'unknown', confidence: 0.0, parameters: {} };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Slightly adjusts confidence based on input quality signals.
   * e.g. very short inputs get a small penalty.
   */
  private adjustConfidence(base: number, input: string, action: IntentAction): number {
    let score = base;

    // Penalty for very short inputs (< 5 words)
    const wordCount = input.split(/\s+/).length;
    if (wordCount < 5) score -= 0.05;

    // Bonus for inputs that are clearly phrased as commands
    if (/^(please |can you |could you |i want you to |i need you to )/i.test(input)) {
      score += 0.05;
    }

    // Cap between 0 and 1
    return Math.min(1.0, Math.max(0.0, score));
  }

  /**
   * Extracts action-specific parameter slots from the input text.
   * These populate Intent.parameters for downstream consumers.
   */
  private extractSlots(input: string, action: IntentAction): Record<string, string> {
    const slots: Record<string, string> = { input };

    switch (action) {
      case 'browse_web': {
        const urlMatch = input.match(/https?:\/\/[^\s]+/i);
        if (urlMatch) slots['url'] = urlMatch[0];
        const domainMatch = input.match(/\bwww\.\S+/i);
        if (domainMatch) slots['url'] = `https://${domainMatch[0]}`;
        break;
      }

      case 'file_op': {
        // Extract quoted path or token with an extension
        const quotedPath = input.match(/["']([^"']+)["']/);
        if (quotedPath) {
          slots['path'] = quotedPath[1];
        } else {
          const extPath = input.match(/\b\S+\.(txt|json|csv|md|ts|js|py|html|css|log|xml|yaml|yml)\b/i);
          if (extPath) slots['path'] = extPath[0];
        }

        // Extract the verb / operation
        const opMatch = input.match(/\b(read|write|open|save|create|delete|rename|move|copy|list)\b/i);
        if (opMatch) slots['operation'] = opMatch[1].toLowerCase();
        break;
      }

      case 'run_command': {
        // Try to extract the actual command being referenced
        const cmdMatch = input.match(/\b(run|execute|exec)\s+(.+?)(?:\s+in\b|$)/i);
        if (cmdMatch) slots['command'] = cmdMatch[2].trim();
        break;
      }

      case 'remember': {
        // Extract what to remember (everything after the trigger word)
        const memMatch = input.match(/\b(?:remember|store|save|note that|keep in mind)\s+(.+)/i);
        if (memMatch) slots['content'] = memMatch[1].trim();
        break;
      }

      case 'recall': {
        // Extract the topic being recalled
        const recallMatch = input.match(/\b(?:recall|retrieve|remind me (?:about)?|what (?:do i|did i) (?:know about|say about)?)\s*(.+)/i);
        if (recallMatch) slots['query'] = recallMatch[1].trim();
        break;
      }

      case 'search': {
        // Extract the search subject
        const searchMatch = input.match(/\b(?:search for|look up|find|what is|who is|tell me about|explain|define)\s+(.+)/i);
        if (searchMatch) slots['query'] = searchMatch[1].trim();
        break;
      }
    }

    return slots;
  }
}
