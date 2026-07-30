import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { PromptModule, Schemas } from '@ai-pentest/contracts';

const ajv = new Ajv();
addFormats(ajv);
// Use the schema from the contracts package
const validate = ajv.compile(Schemas.Prompt);

export class PromptRegistry {
  private modules: Map<string, PromptModule[]> = new Map();
  private registryPath: string;

  constructor(registryPath: string) {
    this.registryPath = registryPath;
  }

  public async load(): Promise<void> {
    this.modules.clear();
    if (!fs.existsSync(this.registryPath)) {
      fs.mkdirSync(this.registryPath, { recursive: true });
    }

    const files = fs.readdirSync(this.registryPath);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(this.registryPath, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const module = JSON.parse(content);
          
          if (validate(module)) {
            const promptModule = module as unknown as PromptModule;
            const versions = this.modules.get(promptModule.id) || [];
            versions.push(promptModule);
            this.modules.set(promptModule.id, versions);
            console.log(`Loaded prompt module: ${promptModule.id} v${promptModule.version}`);
          } else {
            console.error(`Invalid prompt module ${file}:`, validate.errors);
          }
        } catch (error: any) {
          console.error(`Error loading prompt module ${file}: ${error.message}`);
        }
      }
    }
  }

  public getModule(id: string, version?: string): PromptModule | null {
    const versions = this.modules.get(id);
    if (!versions || versions.length === 0) return null;

    if (version) {
      return versions.find(m => m.version === version) || null;
    }

    // Default to latest version (simple sort for now)
    return versions.sort((a, b) => b.version.localeCompare(a.version))[0];
  }

  public findModulesByTag(tag: string): PromptModule[] {
    const result: PromptModule[] = [];
    for (const versions of this.modules.values()) {
      // For each ID, we take the latest version that matches the tag
      const matches = versions
        .filter(m => m.tags.includes(tag))
        .sort((a, b) => b.version.localeCompare(a.version));
      
      if (matches.length > 0) {
        result.push(matches[0]);
      }
    }
    return result;
  }

  public listAll(): PromptModule[] {
    const all: PromptModule[] = [];
    for (const versions of this.modules.values()) {
      all.push(...versions);
    }
    return all;
  }
}
