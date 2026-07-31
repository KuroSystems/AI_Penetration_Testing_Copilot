import Ajv from 'ajv';
import { 
  ReasoningDecision, 
  Session, 
  Schemas, 
  ValidationResult 
} from '@ai-pentest/contracts';

const ajv = new Ajv();
const validateSchema = ajv.compile(Schemas.Decision);

export class ResponseValidator {
  
  public validate(decision: any, session: Session): ValidationResult {
    const errors: string[] = [];
    
    // 1. Schema Check
    const schemaValid = validateSchema(decision);
    if (!schemaValid) {
      errors.push(...(validateSchema.errors?.map(e => `${e.instancePath} ${e.message}`) || ['Invalid schema']));
    }

    if (!schemaValid) {
        return { isValid: false, errors, isGrounded: false, isSingleAction: false };
    }

    const typedDecision = decision as unknown as ReasoningDecision;

    // 2. Grounding Check (Does it mention things we don't know?)
    const isGrounded = this.checkGrounding(typedDecision, session, errors);

    // 3. Single Action Linter
    const isSingleAction = this.checkSingleAction(typedDecision, errors);

    return {
      isValid: errors.length === 0,
      errors,
      isGrounded,
      isSingleAction
    };
  }

  private checkGrounding(decision: ReasoningDecision, session: Session, errors: string[]): boolean {
    const actionText = decision.recommendedAction.toLowerCase();
    
    // Simple heuristic: find IP-like or Domain-like strings
    const identifiers = actionText.match(/([0-9]{1,3}\.){3}[0-9]{1,3}|([a-z0-9-]+\.)+[a-z]{2,}/g) || [];
    
    let grounded = true;
    for (const id of identifiers) {
      const known = session.target.includes(id) || 
                    session.state.knownFacts.some(f => f.toLowerCase().includes(id));
      
      if (!known) {
        errors.push(`Action references unknown identifier: ${id}`);
        grounded = false;
      }
    }
    return grounded;
  }

  private checkSingleAction(decision: ReasoningDecision, errors: string[]): boolean {
    const actionText = decision.recommendedAction;
    
    // Check for "and", "then", "after that" or bullet points
    const multiIndicators = [
      /\band\b/i,
      /\bthen\b/i,
      /\bafter\b/i,
      /\n/,
      /\r/,
      /\d\./, // 1. 2.
      /[•\-\*]\s/ // bullet points
    ];

    let single = true;
    for (const indicator of multiIndicators) {
      if (indicator.test(actionText)) {
        errors.push(`Action seems to contain multiple steps. Please reduce to ONE next step.`);
        single = false;
        break;
      }
    }
    return single;
  }
}
