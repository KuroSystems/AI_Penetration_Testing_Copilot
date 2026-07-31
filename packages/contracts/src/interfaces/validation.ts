export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  isGrounded: boolean;
  isSingleAction: boolean;
}

export interface ValidationEngine {
  validate(decision: any, session: any): ValidationResult;
}
