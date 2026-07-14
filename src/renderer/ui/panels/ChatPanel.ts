export class ChatPanel {
  private container: HTMLDivElement;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) as HTMLDivElement;
    this.render();
    this.attachEvents();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="view-title">Conversational Interface</div>
      <div class="view-description">Consult Astra's primary LLM reasoning brain and review active session logs.</div>
      
      <div class="chat-split-layout">
        <!-- Left: Conversation History list drawer -->
        <div class="history-drawer">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">History threads</span>
            <button id="new-chat-btn" style="background:transparent; border:none; color:var(--accent-cyan); font-size:1.1rem; cursor:pointer;" title="New Thread">+</button>
          </div>
          
          <input type="text" id="history-search" class="custom-input" style="padding: 6px 10px; font-size: 0.8rem; border-radius: 6px; margin-bottom: 8px;" placeholder="Search history..." />
          
          <div class="history-list" id="history-threads-list">
            <div class="history-item active" data-id="thread_1">Draft project plan</div>
            <div class="history-item" data-id="thread_2">Optimize memory cache</div>
            <div class="history-item" data-id="thread_3">Git credentials setup</div>
            <div class="history-item" data-id="thread_4">Explain browser agents</div>
          </div>
        </div>

        <!-- Right: Active Chat Area -->
        <div class="chat-workspace">
          <div class="chat-container" id="chat-messages">
            <div class="chat-bubble assistant">
              Hello! I am Astra OS. My modular architecture and system interfaces are fully configured. Type a prompt below to query my reasoning processor.
            </div>
          </div>
          
          <div class="input-group">
            <input type="text" id="chat-input" class="custom-input" placeholder="Query Astra..." />
            <button id="chat-send" class="primary-btn">Send</button>
          </div>
        </div>
      </div>
    `;
  }

  private attachEvents(): void {
    const input = this.container.querySelector('#chat-input') as HTMLInputElement;
    const sendBtn = this.container.querySelector('#chat-send') as HTMLButtonElement;
    const threadsList = this.container.querySelector('#history-threads-list') as HTMLDivElement;
    const newChatBtn = this.container.querySelector('#new-chat-btn') as HTMLButtonElement;

    // Send chat messages
    const sendMessage = async () => {
      const text = input.value.trim();
      if (!text) return;

      this.appendMessage('user', text);
      input.value = '';

      const thinkingId = this.appendMessage('assistant', 'Thinking...');

      try {
        let reply;
        if ((window as any).astraAPI?.queryBrain) {
          const res = await (window as any).astraAPI.queryBrain(text);
          reply = res.content;
        } else {
          // Browser Simulation
          await new Promise(resolve => setTimeout(resolve, 800));
          reply = `[Astra OS Mock Output] I processed your prompt: "${text}". Ready for integration.`;
        }

        const thinkingBubble = this.container.querySelector(`#${thinkingId}`) as HTMLDivElement;
        if (thinkingBubble) {
          thinkingBubble.innerText = reply;
        }
      } catch (err: any) {
        const thinkingBubble = this.container.querySelector(`#${thinkingId}`) as HTMLDivElement;
        if (thinkingBubble) {
          thinkingBubble.innerText = `Error: ${err.message}`;
          thinkingBubble.style.color = 'var(--accent-rose)';
        }
      }
    };

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });

    // History threads selection
    threadsList.addEventListener('click', (e) => {
      const item = (e.target as HTMLElement).closest('.history-item');
      if (item) {
        threadsList.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        
        // Reset messages with dummy logs matching thread
        const messages = this.container.querySelector('#chat-messages') as HTMLDivElement;
        const threadName = item.textContent || '';
        messages.innerHTML = `
          <div class="chat-bubble assistant">
            Switched session context: "${threadName}". Ready to resume reasoning tree.
          </div>
        `;
      }
    });

    // Add new thread
    newChatBtn.addEventListener('click', () => {
      const newItem = document.createElement('div');
      newItem.className = 'history-item';
      newItem.setAttribute('data-id', `thread_${Math.random()}`);
      newItem.innerText = 'Untitled session';
      
      threadsList.insertBefore(newItem, threadsList.firstChild);
      threadsList.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
      newItem.classList.add('active');

      const messages = this.container.querySelector('#chat-messages') as HTMLDivElement;
      messages.innerHTML = `
        <div class="chat-bubble assistant">
          New session context created. How can I assist you with your tasks?
        </div>
      `;
    });
  }

  private appendMessage(sender: 'user' | 'assistant', text: string): string {
    const messages = this.container.querySelector('#chat-messages') as HTMLDivElement;
    const bubble = document.createElement('div');
    const id = `msg_${Math.random().toString(36).substr(2, 9)}`;
    bubble.id = id;
    bubble.className = `chat-bubble ${sender}`;
    bubble.innerText = text;
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
    return id;
  }
}
