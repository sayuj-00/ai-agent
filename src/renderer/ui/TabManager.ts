export class TabManager {
  private navButtons: NodeListOf<HTMLButtonElement>;
  private panels: NodeListOf<HTMLDivElement>;
  private titleElement: HTMLHeadingElement | null;

  constructor() {
    this.navButtons = document.querySelectorAll('.nav-button');
    this.panels = document.querySelectorAll('.view-panel');
    this.titleElement = document.getElementById('active-panel-title') as HTMLHeadingElement;
    this.init();
  }

  private init(): void {
    this.navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        if (targetId) {
          this.switchTab(targetId, btn);
        }
      });
    });
  }

  public switchTab(targetId: string, button?: HTMLButtonElement): void {
    // Remove active state from all buttons
    this.navButtons.forEach(btn => btn.classList.remove('active'));
    
    // Add active state to correct button
    const activeBtn = button || Array.from(this.navButtons).find(btn => btn.getAttribute('data-target') === targetId);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }

    // Toggle panels
    this.panels.forEach(panel => {
      if (panel.id === targetId) {
        panel.classList.add('active');
        panel.classList.add('animate-fade-in');
        
        // Trigger specific window layout adjustments if needed
        const resizeEvent = new Event('resize');
        window.dispatchEvent(resizeEvent);
      } else {
        panel.classList.remove('active');
        panel.classList.remove('animate-fade-in');
      }
    });

    // Update panel title in main header
    if (this.titleElement && activeBtn) {
      // Remove emojis from button labels for title usage
      const titleText = activeBtn.textContent || '';
      this.titleElement.innerText = titleText.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '').trim();
    }
  }
}
