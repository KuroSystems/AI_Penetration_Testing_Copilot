export enum RuleAction {
  ALLOW = 'allow',
  BLOCK = 'block',
  FLAG = 'flag', // Requires user confirmation
  MODIFY = 'modify'
}

export interface SafetyRule {
  id: string;
  name: string;
  description: string;
  pattern?: string; // Regex for recommendedAction
  category?: string;
  severity: 'low' | 'medium' | 'high';
  action: RuleAction;
  message: string;
  metadata?: Record<string, any>;
}

export interface SafetyReport {
  isSafe: boolean;
  action: RuleAction;
  triggeredRules: SafetyRule[];
  originalDecision: any;
  modifiedDecision?: any;
  message?: string;
}
