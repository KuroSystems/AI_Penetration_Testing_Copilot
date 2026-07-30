export interface StageTransition {
  to: string;
  condition?: string; // Optional DSL or description of what allows this transition
  requiredFacts?: string[]; // Facts that must be present to allow this transition
}

export interface Stage {
  id: string;
  name: string;
  description: string;
  nextPossibleStages: string[]; // List of stage IDs
  metadata?: Record<string, any>;
}

export interface StageGraph {
  id: string;
  name: string;
  initialStage: string;
  stages: Record<string, Stage>;
  version: string;
}
