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

<<<<<<< Updated upstream
export interface ToolRecommendation {
  tool: ToolDefinition;
  reason: string;
  confidence: number;
=======
export interface GuiStep {
  action: string;
  description: string;
  screenshotIdentifier?: string; // For later UI integration
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

export interface GuiToolCatalog {
  id: string;
  name: string;
  version: string;
  tools: GuiToolDefinition[];
}

export interface GuiNavigationRecommendation {
  steps: GuiStep[];
  toolId: string;
  missingParameters: ToolParameter[];
  explanation: string;
}

export interface ToolRecommendation {
  tool: ToolDefinition | GuiToolDefinition;
  reason: string;
  confidence: number;
  type: 'cli' | 'gui';
>>>>>>> Stashed changes
}

export interface GeneratedCommand {
  command: string;
  toolId: string;
  missingParameters: ToolParameter[];
  explanation: string;
}
