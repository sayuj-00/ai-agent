/**
 * Planner Infrastructure — TaskDecomposer
 *
 * Maps a goal string + IntentAction + parameters → ordered PlanStep[]
 *
 * This is the intelligence of the Planner. Each IntentAction has a dedicated
 * template that produces contextual, ordered, dependency-linked steps.
 *
 * Design:
 *  - Templates are context-aware: reads parameters (path, url, command, etc.)
 *    to make steps specific rather than generic.
 *  - Steps include typed labels, descriptions, time estimates, and dependencies.
 *  - execute_task has sub-templates keyed by keyword detection in the goal.
 *  - No external dependencies — pure computation.
 *
 * Upgrade path: replace this class with an LLM-based decomposer.
 * PlannerUseCase will not change at all.
 */

import { PlanStep, StepType, createPlanStep } from '../domain/Plan.js';

// ---------------------------------------------------------------------------
// Internal DSL helper — makes template definitions compact and readable
// ---------------------------------------------------------------------------

/** [type, label, description, estimatedSeconds, explicit_deps?] */
type StepDef = [StepType, string, string, number, string[]?];

/**
 * Converts StepDef tuples into PlanStep objects.
 * If `deps` is omitted, a sequential chain is built automatically:
 *   step 2 depends on step 1, step 3 on step 2, etc.
 */
function buildSteps(...defs: StepDef[]): PlanStep[] {
  return defs.map(([type, label, description, secs, deps], i) => {
    const id = (i + 1).toString();
    const dependencies: string[] = deps ?? (i === 0 ? [] : [i.toString()]);
    return createPlanStep(id, type, label, description, secs, dependencies);
  });
}

// ---------------------------------------------------------------------------
// TaskDecomposer
// ---------------------------------------------------------------------------

export class TaskDecomposer {
  /**
   * Decomposes a goal into an ordered list of typed PlanSteps.
   *
   * @param goal         - The raw user goal / intent rawInput.
   * @param intentAction - The Brain's classified IntentAction.
   * @param parameters   - Extracted slots from the Intent (url, path, command, etc.).
   */
  public decompose(
    goal: string,
    intentAction: string = 'execute_task',
    parameters: Record<string, string> = {}
  ): PlanStep[] {
    switch (intentAction) {
      case 'execute_task':  return this.decomposeTask(goal, parameters);
      case 'file_op':       return this.decomposeFileOp(goal, parameters);
      case 'run_command':   return this.decomposeCommand(goal, parameters);
      case 'browse_web':    return this.decomposeBrowse(goal, parameters);
      case 'search':        return this.decomposeSearch(goal, parameters);
      case 'remember':      return this.decomposeRemember(goal, parameters);
      case 'recall':        return this.decomposeRecall(goal, parameters);
      case 'analyze_image': return this.decomposeVision(goal, parameters);
      default:              return this.decomposeGeneric(goal);
    }
  }

  // =========================================================================
  // execute_task — keyword-dispatched sub-templates
  // =========================================================================

  private decomposeTask(goal: string, _params: Record<string, string>): PlanStep[] {
    if (/python/i.test(goal))                           return this.taskPythonProject(goal);
    if (/react|vue|angular|next\.?js|vite/i.test(goal)) return this.taskFrontendProject(goal);
    if (/api|rest|express|fastapi|flask/i.test(goal))  return this.taskApiProject(goal);
    if (/docker|containerize/i.test(goal))             return this.taskDockerize(goal);
    if (/test|spec|jest|pytest|coverage/i.test(goal))  return this.taskWriteTests(goal);
    if (/refactor|clean|restructure|improve/i.test(goal)) return this.taskRefactor(goal);
    if (/database|schema|migration|sql|mongo/i.test(goal)) return this.taskDatabase(goal);
    return this.taskGenericProject(goal);
  }

  private taskPythonProject(_goal: string): PlanStep[] {
    return buildSteps(
      ['analysis',     'Analyze requirements',       'Parse project requirements and determine Python tech stack (Django/Flask/FastAPI/script)', 5 ],
      ['filesystem',   'Create project folder',      'Create root project directory with src/, tests/, docs/ subdirectories',                   3 ],
      ['filesystem',   'Scaffold source files',      'Generate main.py, requirements.txt, setup.py, README.md, and .gitignore',                 8 ],
      ['terminal',     'Initialize git repository',  'Run git init, create .gitignore for Python, and make initial commit',                     4 ],
      ['terminal',     'Create virtual environment', 'Run python -m venv venv and activate it',                                                  4 ],
      ['terminal',     'Install dependencies',       'Run pip install -r requirements.txt with all listed packages',                            15 ],
      ['terminal',     'Open terminal in project',   'Launch a new terminal session at the project root directory',                              2 ],
      ['verification', 'Verify project structure',   'Run python main.py to check entry point executes without errors',                         5 ],
    );
  }

  private taskFrontendProject(goal: string): PlanStep[] {
    const fw = /react/i.test(goal) ? 'React' : /vue/i.test(goal) ? 'Vue'
             : /angular/i.test(goal) ? 'Angular' : /next/i.test(goal) ? 'Next.js' : 'Vite';
    return buildSteps(
      ['analysis',     'Analyze UI requirements',      `Determine ${fw} project structure, routing, state management, and styling approach`,     6 ],
      ['filesystem',   `Scaffold ${fw} project`,       `Run create-${fw.toLowerCase().replace('.js','')} app with TypeScript and chosen options`, 20],
      ['filesystem',   'Set up folder structure',      'Create components/, pages/, styles/, hooks/, and utils/ directories',                     5 ],
      ['terminal',     'Install dependencies',         'Run npm install for all required packages and dev-dependencies',                          15 ],
      ['filesystem',   'Create initial components',    'Write App, Layout, Header, and entry-point components with placeholder content',          12 ],
      ['filesystem',   'Configure routing',            'Set up client-side routing with all defined page routes',                                  8 ],
      ['terminal',     'Start dev server',             'Run npm run dev and verify the app loads and hot-reload works',                            5 ],
      ['verification', 'Smoke test build',             'Run npm run build to verify the production bundle compiles without errors',               10 ],
    );
  }

  private taskApiProject(goal: string): PlanStep[] {
    const isNode = /express|node|typescript/i.test(goal);
    const runtime = isNode ? 'Node.js/Express' : 'Python';
    const install = isNode ? 'npm install' : 'pip install -r requirements.txt';
    return buildSteps(
      ['analysis',     'Plan API architecture',       `Define ${runtime} routes, data models, auth strategy, and error-handling patterns`,        8 ],
      ['filesystem',   'Create project structure',    'Scaffold src/, routes/, models/, middleware/, config/, and tests/ directories',             5 ],
      ['filesystem',   'Write route handlers',        'Implement CRUD endpoints with request validation, auth guards, and error handling',         20],
      ['filesystem',   'Write data models',           'Define schemas/models with field types, validations, and relationships',                   15 ],
      ['filesystem',   'Write middleware',            'Create auth, logging, rate-limiting, and CORS middleware',                                  8 ],
      ['terminal',     'Install dependencies',        `Run ${install} for all packages`,                                                          10 ],
      ['filesystem',   'Write unit & integration tests', 'Create tests for all routes and critical business logic',                               20 ],
      ['terminal',     'Run test suite',              'Execute all tests and verify 100% pass rate',                                              10 ],
      ['verification', 'Test endpoints manually',     'Use curl / Postman to hit each endpoint and verify response shapes',                        8 ],
    );
  }

  private taskDockerize(_goal: string): PlanStep[] {
    return buildSteps(
      ['analysis',     'Analyze application',          'Identify runtime, dependencies, exposed ports, and required environment variables',        5 ],
      ['filesystem',   'Write Dockerfile',             'Create multi-stage Dockerfile with optimized layer caching and minimal final image',      10 ],
      ['filesystem',   'Write docker-compose.yml',     'Define services, networks, volumes, environment config, and health checks',                8 ],
      ['filesystem',   'Write .dockerignore',          'Exclude node_modules, .git, .env, and dev-only files from the build context',              2 ],
      ['terminal',     'Build Docker image',           'Run docker build -t app:latest and resolve all build errors',                             15 ],
      ['terminal',     'Run container',                'Launch with docker-compose up and verify container starts successfully',                    5 ],
      ['verification', 'Verify container health',      'Check container logs, health check status, and port binding correctness',                  5 ],
    );
  }

  private taskWriteTests(_goal: string): PlanStep[] {
    return buildSteps(
      ['analysis',     'Identify test targets',        'Scan codebase for untested functions, components, and known edge cases',                   8 ],
      ['analysis',     'Plan test structure',          'Define unit, integration, and e2e test categories and target coverage percentage',         5 ],
      ['filesystem',   'Write unit tests',             'Implement isolated tests for all individual functions and modules',                        20 ],
      ['filesystem',   'Write integration tests',      'Test interactions between modules and external service dependencies',                      15 ],
      ['filesystem',   'Write edge-case tests',        'Cover boundary conditions, error paths, and null/undefined inputs',                       10 ],
      ['terminal',     'Run test suite',               'Execute all tests and generate a code coverage report',                                   10 ],
      ['analysis',     'Analyze coverage gaps',        'Review coverage report and add tests for any uncovered critical paths',                    10 ],
      ['verification', 'Verify all tests pass',        'Confirm 100% pass rate and acceptable coverage percentage before committing',               5 ],
    );
  }

  private taskRefactor(_goal: string): PlanStep[] {
    return buildSteps(
      ['analysis',     'Audit existing codebase',      'Identify code smells, duplication, tight coupling, and architectural violations',         10 ],
      ['analysis',     'Plan refactor strategy',       'Define target structure, naming conventions, interface boundaries, and migration order',   8 ],
      ['filesystem',   'Extract interfaces & types',   'Define clean contracts/interfaces before touching implementations',                       10 ],
      ['filesystem',   'Refactor core modules',        'Apply clean architecture patterns, reduce coupling, improve naming',                      25 ],
      ['filesystem',   'Update all imports & exports', 'Fix all import paths, re-export public APIs, remove circular dependencies',               10 ],
      ['terminal',     'Run type checker',             'Execute tsc --noEmit and resolve all type errors',                                        5 ],
      ['terminal',     'Run tests',                    'Execute full test suite to catch any regressions introduced',                             10 ],
      ['verification', 'Final code review',            'Verify naming consistency, documentation completeness, and style compliance',              8 ],
    );
  }

  private taskDatabase(_goal: string): PlanStep[] {
    return buildSteps(
      ['analysis',     'Design schema',                'Define tables/collections, field types, constraints, indexes, and relationships',         10 ],
      ['filesystem',   'Write schema definition',      'Create schema in SQL DDL / ORM model format with all constraints',                        8 ],
      ['filesystem',   'Write migration files',        'Create versioned migration files for each schema change',                                  8 ],
      ['filesystem',   'Write seed data',              'Create realistic development seed data for all tables/collections',                        5 ],
      ['terminal',     'Run migrations',               'Apply all migration files to the target database in order',                                5 ],
      ['filesystem',   'Write repository layer',       'Implement data-access objects / repository pattern with typed queries',                   15 ],
      ['verification', 'Verify data integrity',        'Run SELECT queries to confirm schema correctness and seed data is valid',                  5 ],
    );
  }

  private taskGenericProject(goal: string): PlanStep[] {
    return buildSteps(
      ['analysis',     'Analyze request',              `Understand goal: "${goal.substring(0, 55)}${goal.length > 55 ? '…' : ''}"`,               5 ],
      ['analysis',     'Plan approach',                'Identify required tools, resources, and optimal execution strategy',                        8 ],
      ['filesystem',   'Prepare workspace',            'Create necessary files, folders, and directory structure',                                 10 ],
      ['analysis',     'Execute core task',            'Perform the primary work defined in the goal',                                            30 ],
      ['verification', 'Validate output',              'Verify results match original requirements and quality standards',                         10 ],
      ['output',       'Return results',               'Format and deliver the final output to the user',                                          5 ],
    );
  }

  // =========================================================================
  // file_op — operation-dispatched sub-templates
  // =========================================================================

  private decomposeFileOp(goal: string, params: Record<string, string>): PlanStep[] {
    const op   = params['operation'] || this.detectFileOperation(goal);
    const path = params['path'] || 'the target path';
    switch (op) {
      case 'write':  return this.fileWrite(path);
      case 'create': return this.fileCreate(path);
      case 'delete': return this.fileDelete(path);
      case 'list':   return this.fileList(path);
      default:       return this.fileRead(path);
    }
  }

  private detectFileOperation(goal: string): string {
    if (/\bwrite|save|update|modify\b/i.test(goal))    return 'write';
    if (/\bcreate|make|new|touch\b/i.test(goal))       return 'create';
    if (/\bdelete|remove|rm\b/i.test(goal))            return 'delete';
    if (/\blist|show|display|ls|dir\b/i.test(goal))    return 'list';
    return 'read';
  }

  private fileRead(path: string): PlanStep[] {
    return buildSteps(
      ['filesystem',   'Validate file path',    `Check that "${path}" exists on the filesystem`,                   2 ],
      ['filesystem',   'Check read permissions','Verify the process has read access to the target file',            1 ],
      ['filesystem',   'Read file content',     `Load the full contents of "${path}" into memory`,                  3 ],
      ['output',       'Return content',        'Parse, decode, and return the file content to the caller',         1 ],
    );
  }

  private fileWrite(path: string): PlanStep[] {
    return buildSteps(
      ['filesystem',   'Validate target path',  `Verify "${path}" is a valid, writable filesystem location`,        2 ],
      ['analysis',     'Prepare content',       'Validate, format, and sanitize the content to be written',          3 ],
      ['filesystem',   'Write to file',         `Atomically write the prepared content to "${path}"`,                3 ],
      ['verification', 'Verify write',          'Read the file back and confirm its content matches what was written', 2],
      ['output',       'Confirm completion',    'Return write-success status, byte count, and final file size',       1 ],
    );
  }

  private fileCreate(path: string): PlanStep[] {
    return buildSteps(
      ['filesystem',   'Check existence',       `Verify "${path}" does not already exist to prevent accidental overwrite`, 2],
      ['filesystem',   'Create parent dirs',    'Ensure all parent directories in the path exist (mkdir -p)',               2],
      ['filesystem',   'Create target',         `Create "${path}" with correct type (file/directory) and initial content`,  3],
      ['verification', 'Verify creation',       'Confirm the file/folder exists with correct permissions and size',         2],
    );
  }

  private fileDelete(path: string): PlanStep[] {
    return buildSteps(
      ['filesystem',   'Validate target',       `Confirm "${path}" exists and is accessible`,                       2 ],
      ['analysis',     'Safety check',          'Verify deletion is not targeting a system or protected directory',  3 ],
      ['filesystem',   'Delete target',         `Permanently remove "${path}" (and contents if directory)`,          2 ],
      ['verification', 'Confirm deletion',      'Verify the target no longer exists in the filesystem',              1 ],
    );
  }

  private fileList(path: string): PlanStep[] {
    return buildSteps(
      ['filesystem',   'Validate directory',    `Check "${path}" exists and is a readable directory`,               2 ],
      ['filesystem',   'List contents',         'Read all files and subdirectories with metadata (size, dates)',     3 ],
      ['analysis',     'Filter & sort',         'Apply requested filters and sort by name, date, or size',           3 ],
      ['output',       'Return listing',        'Format directory contents and return structured listing to caller', 1 ],
    );
  }

  // =========================================================================
  // run_command
  // =========================================================================

  private decomposeCommand(goal: string, params: Record<string, string>): PlanStep[] {
    const cmd = params['command'] || goal;
    const short = cmd.substring(0, 55);
    return buildSteps(
      ['analysis',     'Parse command',          `Extract and validate command tokens from: "${short}…"`,           2 ],
      ['analysis',     'Safety check',           'Verify command does not contain destructive or injection patterns', 3],
      ['terminal',     'Prepare environment',    'Set working directory, PATH, and required environment variables',  2 ],
      ['terminal',     'Execute command',        `Run: ${short}${cmd.length > 55 ? '…' : ''}`,                     10 ],
      ['terminal',     'Capture output',         'Collect stdout, stderr, and exit code from the process',           3 ],
      ['output',       'Return result',          'Format command output with exit code and return to caller',        2 ],
    );
  }

  // =========================================================================
  // browse_web
  // =========================================================================

  private decomposeBrowse(_goal: string, params: Record<string, string>): PlanStep[] {
    const url = params['url'] || 'the target URL';
    return buildSteps(
      ['browser',      'Launch browser session',  'Start a headless browser with required viewport and user-agent config', 5],
      ['browser',      'Navigate to URL',         `Load: ${url}`,                                                          4],
      ['browser',      'Wait for page ready',     'Wait for DOMContentLoaded + network idle before interacting',            5],
      ['browser',      'Extract page content',    'Scrape text, links, structured data, and capture screenshot',            5],
      ['browser',      'Close browser session',   'Gracefully close the browser and release all resources',                 2],
      ['output',       'Return page content',     'Return extracted data, screenshot path, and metadata to caller',         2],
    );
  }

  // =========================================================================
  // search
  // =========================================================================

  private decomposeSearch(_goal: string, params: Record<string, string>): PlanStep[] {
    const query = params['query'] || _goal;
    const short = query.substring(0, 55);
    return buildSteps(
      ['analysis',     'Parse search query',      `Extract key terms and intent from: "${short}${query.length > 55 ? '…' : ''}"`, 3],
      ['search',       'Query knowledge sources', 'Search available knowledge bases, indexes, and web sources',                    8],
      ['search',       'Aggregate results',       'Collect, deduplicate, and rank results by relevance and authority',              5],
      ['analysis',     'Synthesize answer',       'Combine top results into a coherent, factual, source-cited answer',              8],
      ['output',       'Return answer',           'Format and deliver the synthesized answer with source references',               2],
    );
  }

  // =========================================================================
  // remember
  // =========================================================================

  private decomposeRemember(_goal: string, params: Record<string, string>): PlanStep[] {
    const content = params['content'] || _goal;
    const short = content.substring(0, 55);
    return buildSteps(
      ['analysis',     'Extract information',     `Identify the information to persist: "${short}${content.length > 55 ? '…' : ''}"`, 2],
      ['analysis',     'Categorize & tag',        'Assign category, importance level, and searchable tags to the content',              4],
      ['memory',       'Encode as embedding',     'Convert content into a vector embedding for semantic storage',                       4],
      ['memory',       'Store in memory index',   'Write embedding + raw content to the vector database',                              3],
      ['output',       'Confirm storage',         'Return confirmation with the assigned memory ID and assigned tags',                  1],
    );
  }

  // =========================================================================
  // recall
  // =========================================================================

  private decomposeRecall(_goal: string, params: Record<string, string>): PlanStep[] {
    const query = params['query'] || _goal;
    const short = query.substring(0, 55);
    return buildSteps(
      ['analysis',     'Parse recall query',      `Understand what to retrieve: "${short}${query.length > 55 ? '…' : ''}"`,          3],
      ['memory',       'Search memory index',     'Run semantic similarity search against all stored memory embeddings',               6],
      ['memory',       'Rank & filter results',   'Score results by relevance + recency and discard low-confidence matches',           3],
      ['analysis',     'Format matches',          'Structure recalled memories into a readable, attributed format',                    3],
      ['output',       'Return matches',          'Return ranked memory results with confidence scores to the caller',                  1],
    );
  }

  // =========================================================================
  // analyze_image
  // =========================================================================

  private decomposeVision(_goal: string, params: Record<string, string>): PlanStep[] {
    const imgPath = params['path'] || 'the target image';
    return buildSteps(
      ['filesystem',   'Validate image file',     `Check "${imgPath}" exists and is a supported format (jpg/png/webp/gif)`,  2],
      ['filesystem',   'Load image data',         'Read image bytes, decode, and extract metadata (size, format, EXIF)',      3],
      ['vision',       'Run vision analysis',     'Send image to the vision model for content understanding and labeling',   15],
      ['analysis',     'Parse model output',      'Extract labels, bounding boxes, OCR text, and confidence scores',          4],
      ['output',       'Return description',      'Format and return structured vision analysis as readable text',             2],
    );
  }

  // =========================================================================
  // Generic fallback
  // =========================================================================

  private decomposeGeneric(goal: string): PlanStep[] {
    return buildSteps(
      ['analysis',     'Analyze request',         `Understand goal: "${goal.substring(0, 55)}${goal.length > 55 ? '…' : ''}"`,  5],
      ['analysis',     'Plan approach',           'Determine the best approach and required resources',                           5],
      ['analysis',     'Execute primary task',    'Carry out the core work for this request',                                    15],
      ['verification', 'Validate result',         'Verify output quality and correctness against requirements',                   5],
      ['output',       'Return result',           'Format and deliver the final result to the user',                              2],
    );
  }
}
