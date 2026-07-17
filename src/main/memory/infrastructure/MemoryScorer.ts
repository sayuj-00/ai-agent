/**
 * Memory Module Infrastructure — MemoryScorer
 *
 * Computes relevance scores for memory recall queries.
 * Pure computation — ZERO imports, zero runtime state.
 *
 * Scoring model (additive, capped at 1.0):
 *  - Exact phrase match in content   → +0.60
 *  - All words present in content    → +0.40
 *  - Partial word match in content   → +0.20
 *  - Tag match (exact)               → +0.30
 *  - Tag match (partial)             → +0.15
 *  - Category filter match           → +0.10
 *  - Recency bonus (< 1 hour)        → +0.15
 *  - Recency bonus (< 24 hours)      → +0.10
 *  - Importance weight               → ×0.8–1.2 multiplier
 */

import type { MemoryNode } from '../domain/MemoryTypes.js';

export interface ScoreDetail {
  total: number;
  matchedOn: ('content' | 'tags' | 'category')[];
}

export const MemoryScorer = {
  /**
   * Score a single memory node against a query string.
   * Returns { total: 0–1, matchedOn: [...] }
   */
  score(node: MemoryNode, query: string): ScoreDetail {
    if (!query.trim()) return { total: 0, matchedOn: [] };

    const q        = query.toLowerCase().trim();
    const content  = node.content.toLowerCase();
    const tags     = node.tags.map(t => t.toLowerCase());
    const words    = q.split(/\s+/).filter(Boolean);

    let score = 0;
    const matchedOn: ScoreDetail['matchedOn'] = [];

    // ── Content scoring ──────────────────────────────────────────────────────
    if (content.includes(q)) {
      score += 0.60;
      matchedOn.push('content');
    } else if (words.length > 1 && words.every(w => content.includes(w))) {
      score += 0.40;
      matchedOn.push('content');
    } else if (words.some(w => content.includes(w))) {
      score += 0.20;
      if (!matchedOn.includes('content')) matchedOn.push('content');
    }

    // ── Tag scoring ──────────────────────────────────────────────────────────
    if (tags.some(t => t === q || words.some(w => t === w))) {
      score += 0.30;
      matchedOn.push('tags');
    } else if (tags.some(t => t.includes(q) || words.some(w => t.includes(w)))) {
      score += 0.15;
      if (!matchedOn.includes('tags')) matchedOn.push('tags');
    }

    // ── Category relevance ───────────────────────────────────────────────────
    if (node.category.includes(q) || q.includes(node.category)) {
      score += 0.10;
      matchedOn.push('category');
    }

    // ── Recency bonus ────────────────────────────────────────────────────────
    const ageMs = Date.now() - new Date(node.lastAccessedAt).getTime();
    if (ageMs < 3_600_000)  score += 0.15;     // < 1 hour
    else if (ageMs < 86_400_000) score += 0.10; // < 24 hours

    // ── Importance multiplier ────────────────────────────────────────────────
    // importance 0.0 → multiplier 0.8, importance 1.0 → multiplier 1.2
    const importanceMult = 0.8 + node.importance * 0.4;
    score = score * importanceMult;

    return {
      total: Math.min(1.0, Math.max(0.0, score)),
      matchedOn,
    };
  },

  /**
   * Score and filter a list of nodes, returning only those above minScore,
   * sorted descending by score.
   */
  rankNodes(
    nodes: MemoryNode[],
    query: string,
    minScore = 0.1
  ): Array<{ node: MemoryNode; score: number; matchedOn: ('content' | 'tags' | 'category')[] }> {
    return nodes
      .map(node => {
        const { total, matchedOn } = MemoryScorer.score(node, query);
        return { node, score: total, matchedOn };
      })
      .filter(r => r.score >= minScore)
      .sort((a, b) => b.score - a.score);
  },
};
