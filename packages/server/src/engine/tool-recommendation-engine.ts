import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import { 
  ToolCatalog, 
  ToolDefinition, 
  ToolRecommendation, 
  ReasoningDecision, 
  Schemas,
  Session
} from '@ai-pentest/contracts';

const ajv = new Ajv();
const validateCatalog = ajv.compile(Schemas.ToolCatalog);

export class ToolRecommendationEngine {
  private catalogs: ToolCatalog[] = [];
  private registryPath: string;

  constructor(registryPath: string) {
    this.registryPath = registryPath;
  }

  public async load(): Promise<void> {
    this.catalogs = [];
    if (!fs.existsSync(this.registryPath)) {
      fs.mkdirSync(this.registryPath, { recursive: true });
      return;
    }

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
          } else {
            console.error(`Invalid tool catalog ${file}:`, validateCatalog.errors);
          }
        } catch (error: any) {
          console.error(`Error loading tool catalog ${file}: ${error.message}`);
        }
      }
    }
  }

  public recommend(decision: ReasoningDecision, session: Session): ToolRecommendation[] {
    const recommendations: ToolRecommendation[] = [];
    
    for (const catalog of this.catalogs) {
      for (const tool of catalog.tools) {
        let score = 0;
        
        // Match by tags
        const matchedTags = tool.tags.filter(tag => 
          decision.recommendedAction.toLowerCase().includes(tag.toLowerCase()) ||
          decision.rationale.toLowerCase().includes(tag.toLowerCase())
        );
        score += matchedTags.length * 0.2;

        // Match by name
        if (decision.recommendedAction.toLowerCase().includes(tool.name.toLowerCase()) ||
            decision.recommendedAction.toLowerCase().includes(tool.id.toLowerCase())) {
          score += 0.5;
        }

        // Match by category
        if (tool.category === decision.currentPhase) {
          score += 0.1;
        }

        if (score > 0) {
          recommendations.push({
            tool,
            reason: `Matched tags: ${matchedTags.join(', ')}`,
            confidence: Math.min(score, 1.0)
          });
        }
      }
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }
}
