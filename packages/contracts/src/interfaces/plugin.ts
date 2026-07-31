export enum PluginType {
  RECON = 'recon',
  EXPLOITATION = 'exploitation',
  REPORTING = 'reporting',
  UTILITY = 'utility'
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  type: PluginType;
  entryPoint: string;
  dependencies?: Record<string, string>;
  configSchema?: Record<string, any>; // JSON Schema for plugin config
  capabilities: string[];
  permissions: string[]; // e.g. ["filesystem", "network", "session_state"]
}

export interface Extension {
  initialize(context: ExtensionContext): Promise<void>;
  shutdown?(): Promise<void>;
}

export interface ExtensionContext {
  manifest: PluginManifest;
  config: Record<string, any>;
  logger: {
    log(msg: string): void;
    error(msg: string): void;
  };
  // We can add more restricted access to internal engines here later
}
