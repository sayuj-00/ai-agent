/**
 * Browser Controller Infrastructure — SearchEngineRegistry
 *
 * Maps search engine names to URL templates.
 * Pure computation — zero imports.
 * Extensible: add a new engine by adding one entry to the map.
 */

export type SearchEngine = 'google' | 'bing' | 'duckduckgo' | 'brave' | 'ecosia';

interface EngineConfig {
  name: string;
  searchUrl: string;        // {query} is replaced with the encoded query
  suggestUrl?: string;
}

const ENGINES: Record<SearchEngine, EngineConfig> = {
  google: {
    name: 'Google',
    searchUrl: 'https://www.google.com/search?q={query}',
    suggestUrl: 'https://suggestqueries.google.com/complete/search?client=firefox&q={query}',
  },
  bing: {
    name: 'Bing',
    searchUrl: 'https://www.bing.com/search?q={query}',
  },
  duckduckgo: {
    name: 'DuckDuckGo',
    searchUrl: 'https://duckduckgo.com/?q={query}',
  },
  brave: {
    name: 'Brave Search',
    searchUrl: 'https://search.brave.com/search?q={query}',
  },
  ecosia: {
    name: 'Ecosia',
    searchUrl: 'https://www.ecosia.org/search?q={query}',
  },
};

export const SearchEngineRegistry = {
  /**
   * Build a search URL for the given engine and query.
   * Defaults to Google if engine not found.
   */
  buildUrl(engine: string, query: string): string {
    const config = ENGINES[engine as SearchEngine] ?? ENGINES.google;
    return config.searchUrl.replace('{query}', encodeURIComponent(query));
  },

  /** Get the display name of an engine */
  getName(engine: string): string {
    return (ENGINES[engine as SearchEngine] ?? ENGINES.google).name;
  },

  /** List all supported engine keys */
  list(): SearchEngine[] {
    return Object.keys(ENGINES) as SearchEngine[];
  },
};
