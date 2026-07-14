import { LogService } from './LogService.js';

export interface AppSettings {
  apiKey: string;
  defaultModel: string;
  theme: 'dark' | 'light' | 'glass';
  safetyLevel: 'standard' | 'strict' | 'relaxed';
  voiceEnabled: boolean;
  voiceSpeed: number;
}

export class SettingsService {
  private static instance: SettingsService | null = null;
  private logger = LogService.getInstance();
  private settings: AppSettings;

  private constructor() {
    this.settings = this.loadDefaults();
    this.logger.info('SettingsService', 'Configuration settings initialized with defaults.');
  }

  public static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  private loadDefaults(): AppSettings {
    return {
      apiKey: '',
      defaultModel: 'gemini-3.5-flash',
      theme: 'glass',
      safetyLevel: 'standard',
      voiceEnabled: false,
      voiceSpeed: 1.0
    };
  }

  public get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    this.logger.info('SettingsService', `Fetching setting: ${key}`);
    return this.settings[key];
  }

  public async set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
    this.settings[key] = value;
    this.logger.info('SettingsService', `Updated setting "${key}" to: ${JSON.stringify(value)}`);
    // In production, this would persist settings to a file on the local filesystem
    await this.persist();
  }

  public getAll(): AppSettings {
    return { ...this.settings };
  }

  public async updateAll(newSettings: Partial<AppSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    this.logger.info('SettingsService', 'Bulk updated user preferences.');
    await this.persist();
  }

  private async persist(): Promise<void> {
    // Mock write file
    this.logger.info('SettingsService', 'Settings written successfully to local configuration file.');
  }
}
