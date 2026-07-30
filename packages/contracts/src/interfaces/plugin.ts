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
}
