import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import { 
  SafetyRule, 
  SafetyReport, 
  ReasoningDecision, 
  RuleAction, 
  Schemas,
  Session
} from '@ai-pentest/contracts';

const ajv = new Ajv();
const validateRule = ajv.compile(Schemas.Safety);

export class RulesEngine {
  private rules: SafetyRule[] = [];
  private registryPath: string;

  constructor(registryPath: string) {
    this.registryPath = registryPath;
  }

  public async load(): Promise<void> {
    this.rules = [];
    if (!fs.existsSync(this.registryPath)) {
      fs.mkdirSync(this.registryPath, { recursive: true });
    }

    const files = fs.readdirSync(this.registryPath);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(this.registryPath, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const rule = JSON.parse(content);
          
          if (validateRule(rule)) {
            const safetyRule = rule as unknown as SafetyRule;
            this.rules.push(safetyRule);
            console.log(`Loaded safety rule: ${safetyRule.id}`);
          } else {
            console.error(`Invalid safety rule ${file}:`, validateRule.errors);
          }
        } catch (error: any) {
          console.error(`Error loading safety rule ${file}: ${error.message}`);
        }
      }
    }
  }

  public evaluate(decision: ReasoningDecision, session: Session): SafetyReport {
    const triggeredRules: SafetyRule[] = [];
    let finalAction = RuleAction.ALLOW;
    let message = '';

    for (const rule of this.rules) {
      let triggered = false;

      // 1. Pattern Matching on Action
      if (rule.pattern) {
        const regex = new RegExp(rule.pattern, 'i');
        if (regex.test(decision.recommendedAction) || regex.test(decision.rationale)) {
          triggered = true;
        }
      }

      // 2. Scope Check (Simplified for Phase 9)
      if (rule.category === 'scope') {
        // If session has specific scope metadata, we could check here.
        // For now, if the action contains a target that doesn't match session.target, we might flag it.
        const target = session.target;
        if (decision.recommendedAction.includes('.') && !decision.recommendedAction.includes(target)) {
           // Heuristic: looks like an IP/domain but not the session target
           triggered = true;
        }
      }

      if (triggered) {
        triggeredRules.push(rule);
        
        // Upgrade final action based on priority: BLOCK > FLAG > MODIFY > ALLOW
        if (rule.action === RuleAction.BLOCK) {
          finalAction = RuleAction.BLOCK;
        } else if (rule.action === RuleAction.FLAG && finalAction !== RuleAction.BLOCK) {
          finalAction = RuleAction.FLAG;
        } else if (rule.action === RuleAction.MODIFY && finalAction !== RuleAction.BLOCK && finalAction !== RuleAction.FLAG) {
          finalAction = RuleAction.MODIFY;
        }
        
        message = rule.message;
      }
    }

    return {
      isSafe: finalAction !== RuleAction.BLOCK,
      action: finalAction,
      triggeredRules,
      originalDecision: decision,
      message: triggeredRules.length > 0 ? message : undefined
    };
  }

  public listAll(): SafetyRule[] {
    return this.rules;
  }
}
