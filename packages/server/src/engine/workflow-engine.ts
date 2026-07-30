import { 
  StageGraph, 
  Session, 
  SessionRepository,
  Schemas
} from '@ai-pentest/contracts';
import Ajv from 'ajv';
import fs from 'fs';
import path from 'path';

const ajv = new Ajv();
const validateWorkflow = ajv.compile(Schemas.Workflow);

export class WorkflowEngine {
  private graphs: Map<string, StageGraph> = new Map();
  private registryPath: string;

  constructor(registryPath: string) {
    this.registryPath = registryPath;
  }

  public async load(): Promise<void> {
    this.graphs.clear();
    if (!fs.existsSync(this.registryPath)) {
      fs.mkdirSync(this.registryPath, { recursive: true });
    }

    const files = fs.readdirSync(this.registryPath);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(this.registryPath, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const graph = JSON.parse(content);
          
          if (validateWorkflow(graph)) {
            const stageGraph = graph as unknown as StageGraph;
            this.graphs.set(stageGraph.id, stageGraph);
            console.log(`Loaded workflow graph: ${stageGraph.id} v${stageGraph.version}`);
          } else {
            console.error(`Invalid workflow graph ${file}:`, validateWorkflow.errors);
          }
        } catch (error: any) {
          console.error(`Error loading workflow graph ${file}: ${error.message}`);
        }
      }
    }
  }

  public getGraph(id: string): StageGraph | null {
    return this.graphs.get(id) || null;
  }

  public validateTransition(graphId: string, fromStageId: string, toStageId: string): boolean {
    const graph = this.graphs.get(graphId);
    if (!graph) return false;

    const fromStage = graph.stages[fromStageId];
    if (!fromStage) return false;

    // Allow retreat or advance if it's in the allowed list
    return fromStage.nextPossibleStages.includes(toStageId) || fromStageId === toStageId;
  }

  public listAll(): StageGraph[] {
    return Array.from(this.graphs.values());
  }
}
