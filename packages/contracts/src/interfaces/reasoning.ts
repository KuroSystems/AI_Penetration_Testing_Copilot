export interface ReasoningDecision {
  currentPhase: string;
  missingInfo: string[];
  recommendedAction: string;
  rationale: string;
  confidence: number;
  needsClarification: boolean;
  metadata?: Record<string, any>;
}
