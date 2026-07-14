import { LogService } from './LogService.js';

export class VoiceService {
  private static instance: VoiceService | null = null;
  private logger = LogService.getInstance();
  private isSpeaking = false;
  private isListening = false;

  private constructor() {
    this.logger.info('VoiceService', 'Voice interactions (TTS / STT engine) ready.');
  }

  public static getInstance(): VoiceService {
    if (!VoiceService.instance) {
      VoiceService.instance = new VoiceService();
    }
    return VoiceService.instance;
  }

  public async speak(text: string): Promise<void> {
    this.logger.info('VoiceService', `Synthesizing audio output: "${text.substring(0, 50)}..."`);
    this.isSpeaking = true;
    
    // Simulate vocal output duration
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    this.isSpeaking = false;
    this.logger.info('VoiceService', 'TTS output speech synthesis complete.');
  }

  public async listen(): Promise<string> {
    this.logger.info('VoiceService', 'Activating speech-to-text microphone stream...');
    this.isListening = true;
    
    // Simulate listening duration
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    this.isListening = false;
    const transcribedText = 'Hey Astra, analyze this workspace for me.';
    
    this.logger.info('VoiceService', `Mic input transcribed: "${transcribedText}"`);
    return transcribedText;
  }

  public getStatus(): { isSpeaking: boolean; isListening: boolean } {
    return { isSpeaking: this.isSpeaking, isListening: this.isListening };
  }
}
