import fs from 'fs';
import path from 'path';
import { AppConfig } from '@ai-pentest/contracts';

export class ConfigManager {
  private configPath: string;
  private currentConfig: AppConfig;

  private readonly DEFAULT_CONFIG: AppConfig = {
    model: {
      modelName: 'llama3',
      temperature: 0.1,
      topP: 0.9,
      topK: 40,
      contextLength: 4096,
      streaming: true,
      stopSequences: []
    },
    safety: {
      level: 'balanced',
      confirmDestructive: true
    },
    orchestration: {
      checkpointInterval: 5,
      summaryThreshold: 20
    },
    ollamaUrl: 'http://localhost:11434',
    useMock: false
  };

  constructor(configDir: string) {
    this.configPath = path.join(configDir, 'config.json');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    this.currentConfig = this.load();
  }

  private load(): AppConfig {
    if (!fs.existsSync(this.configPath)) {
      this.save(this.DEFAULT_CONFIG);
      return this.DEFAULT_CONFIG;
    }

    try {
      const content = fs.readFileSync(this.configPath, 'utf-8');
      return { ...this.DEFAULT_CONFIG, ...JSON.parse(content) };
    } catch (error) {
      console.error('Failed to load config, using defaults:', error);
      return this.DEFAULT_CONFIG;
    }
  }

  public getConfig(): AppConfig {
    return this.currentConfig;
  }

  public updateConfig(updates: Partial<AppConfig>): AppConfig {
    this.currentConfig = {
      ...this.currentConfig,
      ...updates,
      model: { ...this.currentConfig.model, ...updates.model },
      safety: { ...this.currentConfig.safety, ...updates.safety },
      orchestration: { ...this.currentConfig.orchestration, ...updates.orchestration }
    };
    this.save(this.currentConfig);
    return this.currentConfig;
  }

  private save(config: AppConfig): void {
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
  }
}
