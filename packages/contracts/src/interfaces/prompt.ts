export interface PromptModule {
  id: string;
  name: string;
  version: string;
  description: string;
  template: string; // Handlebars or similar template
  inputVariables: string[];
  outputFormat?: string; // JSON schema or description
  tags: string[];
  author?: string;
  category?: string;
  changelog?: string;
  metadata?: Record<string, any>;
}

export interface PromptModuleRepository {
  getById(id: string): Promise<PromptModule | null>;
  findByName(name: string): Promise<PromptModule | null>;
  list(): Promise<PromptModule[]>;
}
