import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { OutputFormatterTemplate, ReasoningDecision } from '@ai-pentest/contracts';

export class OutputFormatter {
  private templates: Map<string, OutputFormatterTemplate> = new Map();
  private registryPath: string;

  constructor(registryPath: string) {
    this.registryPath = registryPath;
  }

  public async load(): Promise<void> {
    this.templates.clear();
    if (!fs.existsSync(this.registryPath)) {
      fs.mkdirSync(this.registryPath, { recursive: true });
    }

    const files = fs.readdirSync(this.registryPath);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(this.registryPath, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const template = JSON.parse(content);
          this.templates.set(template.id, template as OutputFormatterTemplate);
          console.log(`Loaded formatter template: ${template.id}`);
        } catch (error: any) {
          console.error(`Error loading formatter ${file}: ${error.message}`);
        }
      }
    }
  }

  public format(decision: ReasoningDecision, templateId: string = 'standard-markdown'): string {
    const templateObj = this.templates.get(templateId);
    if (!templateObj) {
      throw new Error(`Formatter template ${templateId} not found`);
    }

    const compile = Handlebars.compile(templateObj.template);
    // Add confidence score for easier formatting
    const context = {
        ...decision,
        confidenceScore: `${(decision.confidence * 100).toFixed(0)}%`
    };
    return compile(context);
  }
}
