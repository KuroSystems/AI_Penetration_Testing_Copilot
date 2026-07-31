import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import { 
  ToolCatalog, 
  ToolDefinition, 
  GuiToolCatalog,
  GuiToolDefinition,
  ToolRecommendation, 
  ReasoningDecision, 
  Schemas,
  Session
} from '@ai-pentest/contracts';

const ajv = new Ajv();
const validateCatalog = ajv.compile(Schemas.ToolCatalog);
const validateGuiCatalog = ajv.compile(Schemas.GuiToolCatalog);

export class ToolRecommendationEngine {
  private catalogs: ToolCatalog[] = [];
  private guiCatalogs: GuiToolCatalog[] = [];
  private registryPath: string;
  private guiRegistryPath: string;

  constructor(registryPath: string, guiRegistryPath: string) {
    this.registryPath = registryPath;
    this.guiRegistryPath = guiRegistryPath;
  }

  public async load(): Promise<void> {
    this.catalogs = [];
    this.guiCatalogs = [];
    
    if (fs.existsSync(this.registryPath)) {
      const files = fs.readdirSync(this.registryPath);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.registryPath, file);
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const catalog = JSON.parse(content);
            if (validateCatalog(catalog)) {
              this.catalogs.push(catalog as unknown as ToolCatalog);
              console.log(`Loaded tool catalog: ${catalog.id}`);
            }
          } catch (error: any) {
            console.error(`Error loading tool catalog ${file}: ${error.message}`);
          }
        }
      }
    }

    if (fs.existsSync(this.guiRegistryPath)) {
      const files = fs.readdirSync(this.guiRegistryPath);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.guiRegistryPath, file);
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const catalog = JSON.parse(content);
            if (validateGuiCatalog(catalog)) {
              this.guiCatalogs.push(catalog as unknown as GuiToolCatalog);
              console.log(`Loaded GUI tool catalog: ${catalog.id}`);
            }
          } catch (error: any) {
            console.error(`Error loading GUI tool catalog ${file}: ${error.message}`);
          }
        }
      }
    }
  }

  public recommend(decision: ReasoningDecision, session: Session): ToolRecommendation[] {
    const recommendations: ToolRecommendation[] = [];
    
    for (const catalog of this.catalogs) {
      for (const tool of catalog.tools) {
        const score = this.calculateScore(tool, decision);
        if (score > 0) {
          recommendations.push({
            tool,
            reason: `Matched based on decision context`,
            confidence: Math.min(score, 1.0),
            type: 'cli'
          });
        }
      }
    }

    for (const catalog of this.guiCatalogs) {
      for (const tool of catalog.tools) {
        const score = this.calculateScore(tool, decision);
        if (score > 0) {
          recommendations.push({
            tool,
            reason: `Matched based on decision context`,
            confidence: Math.min(score, 1.0),
            type: 'gui'
          });
        }
      }
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  private calculateScore(tool: ToolDefinition | GuiToolDefinition, decision: ReasoningDecision): number {
    let score = 0;
    const matchedTags = tool.tags.filter(tag => 
      decision.recommendedAction.toLowerCase().includes(tag.toLowerCase()) ||
      decision.rationale.toLowerCase().includes(tag.toLowerCase())
    );
    score += matchedTags.length * 0.2;

    if (decision.recommendedAction.toLowerCase().includes(tool.name.toLowerCase()) ||
        decision.recommendedAction.toLowerCase().includes(tool.id.toLowerCase())) {
      score += 0.5;
    }

    if (tool.category === decision.currentPhase) {
      score += 0.1;
    }

    return score;
  }
}
