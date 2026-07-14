"use strict";
/**
 * Manual test script for Brain + Planner modules.
 * Run with: node --loader ts-node/esm test-brain-planner.ts
 * Or compile first: npx tsc test-brain-planner.ts --target ES2020 --module commonjs --outDir dist-test
 *
 * NOTE: Because these modules are pure computation (no Electron deps),
 *       they can be tested directly in Node.js.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const IntentParser_js_1 = require("./src/main/brain/infrastructure/IntentParser.js");
const TaskDecomposer_js_1 = require("./src/main/planner/infrastructure/TaskDecomposer.js");
// ─── Test inputs ────────────────────────────────────────────────────────────
const TEST_INPUTS = [
    'Create a new Python project',
    'Search for TypeScript best practices',
    'Remember that my API key is abc-123',
    'Read the file config.json',
    'Browse to https://github.com',
    'Run git status in terminal',
    'Analyze the screenshot image.png',
    'Recall what I told you about the project',
    'Build a REST API with Express',
    'How are you doing?',
];
// ─── Run tests ──────────────────────────────────────────────────────────────
const parser = new IntentParser_js_1.IntentParser();
const decomposer = new TaskDecomposer_js_1.TaskDecomposer();
console.log('\n' + '═'.repeat(70));
console.log('  BRAIN + PLANNER — Manual Test');
console.log('═'.repeat(70) + '\n');
for (const input of TEST_INPUTS) {
    // 1. Brain: classify intent
    const parsed = parser.parse(input);
    console.log(`📥 Input: "${input}"`);
    console.log(`🧠 Brain → action="${parsed.action}" | confidence=${(parsed.confidence * 100).toFixed(0)}%`);
    const paramEntries = Object.entries(parsed.parameters).filter(([k]) => k !== 'input');
    if (paramEntries.length > 0) {
        console.log(`   Params: ${paramEntries.map(([k, v]) => `${k}="${v}"`).join(', ')}`);
    }
    // 2. Planner: decompose into steps (skip chat/unknown)
    const skipActions = new Set(['chat', 'unknown']);
    if (!skipActions.has(parsed.action)) {
        const steps = decomposer.decompose(input, parsed.action, parsed.parameters);
        console.log(`📋 Planner → ${steps.length} steps (complexity: ${steps.length <= 4 ? 'simple' : steps.length <= 7 ? 'moderate' : 'complex'})`);
        const stepTypeIcons = {
            filesystem: '📁', terminal: '💻', browser: '🌐', memory: '🧠',
            search: '🔍', vision: '👁️', analysis: '⚙️', verification: '✅', output: '📤'
        };
        for (const step of steps) {
            const icon = stepTypeIcons[step.type] ?? '▸';
            const deps = step.dependencies.length > 0 ? ` → (after ${step.dependencies.join(',')})` : '';
            console.log(`   ${icon} ${step.id}. [${step.type}] ${step.label} ~${step.estimatedSeconds}s${deps}`);
        }
    }
    else {
        console.log(`💬 Planner → no plan (conversational intent)`);
    }
    console.log('─'.repeat(70));
}
console.log('\n✅ Test complete.\n');
