import { TabManager } from './ui/TabManager.js';
import { ChatPanel } from './ui/panels/ChatPanel.js';
import { MemoryPanel } from './ui/panels/MemoryPanel.js';
import { PlannerPanel } from './ui/panels/PlannerPanel.js';
import { ToolsPanel } from './ui/panels/ToolsPanel.js';
import { LogsPanel } from './ui/panels/LogsPanel.js';
import { SettingsPanel } from './ui/panels/SettingsPanel.js';

window.addEventListener('DOMContentLoaded', () => {
  console.log('Astra OS active. Booting interface shells...');

  // Initialize page tab switcher
  new TabManager();

  // Instantiate page components
  new ChatPanel('chat-panel');
  new MemoryPanel('memory-panel');
  new PlannerPanel('planner-panel');
  new ToolsPanel('tools-panel');
  new LogsPanel('logs-panel');
  new SettingsPanel('settings-panel');

  // Set system monitoring status text
  const indicator = document.getElementById('system-status-indicator');
  if (indicator) {
    indicator.innerHTML = `
      <span class="status-dot"></span>
      Astra Online
    `;
  }
});
