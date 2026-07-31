import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import { 
  PluginManifest, 
  Extension, 
  ExtensionContext, 
  Schemas 
} from '@ai-pentest/contracts';

const ajv = new Ajv();
const validateManifest = ajv.compile(Schemas.Plugin);

export class PluginManager {
  private plugins: Map<string, { manifest: PluginManifest, extension: Extension }> = new Map();
  private registryPath: string;

  constructor(registryPath: string) {
    this.registryPath = registryPath;
    if (!fs.existsSync(this.registryPath)) {
      fs.mkdirSync(this.registryPath, { recursive: true });
    }
  }

  public async loadPlugins(): Promise<void> {
    const pluginDirs = fs.readdirSync(this.registryPath);
    
    for (const dir of pluginDirs) {
      const pluginPath = path.join(this.registryPath, dir);
      if (!fs.statSync(pluginPath).isDirectory()) continue;

      const manifestPath = path.join(pluginPath, 'manifest.json');
      if (!fs.existsSync(manifestPath)) continue;

      try {
        const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
        const manifest = JSON.parse(manifestContent);

        if (validateManifest(manifest)) {
          await this.initializePlugin(pluginPath, manifest as unknown as PluginManifest);
        } else {
          console.error(`Invalid plugin manifest in ${dir}:`, validateManifest.errors);
        }
      } catch (error: any) {
        console.error(`Failed to load plugin ${dir}: ${error.message}`);
      }
    }
  }

  private async initializePlugin(pluginPath: string, manifest: PluginManifest): Promise<void> {
    try {
      // For a real production sandbox, we'd use a VM or worker thread.
      // For the scaffold, we'll use dynamic import.
      const entryPointPath = path.join(pluginPath, manifest.entryPoint);
      const module = await import(entryPointPath);
      
      const extension: Extension = new module.default();
      
      const context: ExtensionContext = {
        manifest,
        config: {}, // We can load this from ConfigManager later
        logger: {
          log: (msg) => console.log(`[Plugin: ${manifest.id}] ${msg}`),
          error: (msg) => console.error(`[Plugin: ${manifest.id}] ${msg}`)
        }
      };

      await extension.initialize(context);
      this.plugins.set(manifest.id, { manifest, extension });
      console.log(`Plugin initialized: ${manifest.name} v${manifest.version}`);
    } catch (error: any) {
      console.error(`Initialization failed for plugin ${manifest.id}: ${error.message}`);
    }
  }

  public listPlugins(): PluginManifest[] {
    return Array.from(this.plugins.values()).map(p => p.manifest);
  }

  public async shutdown(): Promise<void> {
    for (const { extension } of this.plugins.values()) {
      if (extension.shutdown) {
        await extension.shutdown();
      }
    }
  }
}
