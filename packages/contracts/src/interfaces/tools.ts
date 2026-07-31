export interface ToolParameter {
  name: string;
  description: string;
  required: boolean;
  defaultValue?: string;
  source?: 'session_target' | 'session_fact' | 'user_input';
  factName?: string;
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: 'recon' | 'exploitation' | 'analysis' | 'utility';
  tags: string[];
  commandTemplate: string;
  parameters: ToolParameter[];
}

export interface GuiStep {
  action: string;
  description: string;
  screenshotIdentifier?: string;
}

export interface GuiToolDefinition {
  id: string;
  name: string;
  description: string;
  category: 'recon' | 'exploitation' | 'analysis' | 'utility';
  tags: string[];
  stepsTemplate: GuiStep[];
  parameters: ToolParameter[];
}

export interface ToolCatalog {
  id: string;
  name: string;
  version: string;
  tools: ToolDefinition[];
}

export interface GuiToolCatalog {
  id: string;
  name: string;
  version: string;
  tools: GuiToolDefinition[];
}

export interface ToolRecommendation {
  tool: ToolDefinition | GuiToolDefinition;
  reason: string;
  confidence: number;
  type: 'cli' | 'gui';
}

export interface GeneratedCommand {
  command: string;
  toolId: string;
  missingParameters: ToolParameter[];
  explanation: string;
}

export interface GuiNavigationRecommendation {
  steps: GuiStep[];
  toolId: string;
  missingParameters: ToolParameter[];
  explanation: string;
}
