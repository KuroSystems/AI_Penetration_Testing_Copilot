import { Session, SessionState } from '@ai-pentest/contracts';

export interface ConfidenceResult {
  score: number;
  factors: {
    factor: string;
    impact: number; // positive or negative
  }[];
  isAdequate: boolean;
}

export interface ConfidenceConfig {
  threshold: number;
  weights: {
    factsKnown: number;
    actionHistory: number;
    phaseClarity: number;
  };
}

export class ConfidenceScoringEngine {
  private config: ConfidenceConfig;

  constructor(config?: Partial<ConfidenceConfig>) {
    this.config = {
      threshold: 0.5,
      weights: {
        factsKnown: 0.4,
        actionHistory: 0.3,
        phaseClarity: 0.3
      },
      ...config
    };
  }

  public calculate(session: Session): ConfidenceResult {
    const { state } = session;
    const factors: { factor: string; impact: number }[] = [];

    // 1. Fact Completeness
    const factScore = Math.min(state.knownFacts.length / 5, 1.0); // Simple heuristic: 5 facts = full weight
    factors.push({ factor: 'Known Facts', impact: factScore * this.config.weights.factsKnown });

    // 2. Action History
    const historyScore = Math.min(state.actionHistory.length / 3, 1.0); // 3 actions = full weight
    factors.push({ factor: 'Action History', impact: historyScore * this.config.weights.actionHistory });

    // 3. Phase Clarity
    const phaseScore = state.currentPhase ? 1.0 : 0.0;
    factors.push({ factor: 'Phase Clarity', impact: phaseScore * this.config.weights.phaseClarity });

    const totalScore = factors.reduce((acc, f) => acc + f.impact, 0);

    return {
      score: totalScore,
      factors,
      isAdequate: totalScore >= this.config.threshold
    };
  }
}
