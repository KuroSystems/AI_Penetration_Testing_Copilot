export interface ToolParameter {
  name: string;
  description: string;
  required: boolean;
  defaultValue?: string;
  source?: 'session_target' | 'session_fact' | 'user_input';
  factName?: string; // If source is session_fact, which fact to look for
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: 'recon' | 'exploitation' | 'analysis' | 'utility';
  tags: string[];
  commandTemplate: string; // e.g. "nmap -sV -p {{ports}} {{target}}"
  parameters: ToolParameter[];
}

export interface ToolCatalog {
  id: string;
  name: string;
  version: string;
  tools: ToolDefinition[];
}

export interface ToolRecommendation {
  tool: ToolDefinition;
  reason: string;
  confidence: number;
}

export interface GeneratedCommand {
  command: string;
  toolId: string;
  missingParameters: ToolParameter[];
  explanation: string;
}
