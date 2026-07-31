import { 
  GuiToolDefinition, 
  GuiNavigationRecommendation, 
  Session,
  ToolParameter,
  GuiStep
} from '@ai-pentest/contracts';

export class GuiNavigationEngine {
  public generate(tool: GuiToolDefinition, session: Session, userInputs: Record<string, string> = {}): GuiNavigationRecommendation {
    const missingParameters: ToolParameter[] = [];
    const resolvedParams: Record<string, string> = {};
    
    for (const param of tool.parameters) {
      let value: string | undefined;

      if (userInputs[param.name]) {
        value = userInputs[param.name];
      } else if (param.source === 'session_target') {
        value = session.target;
      } else if (param.source === 'session_fact' && param.factName) {
        const fact = session.state.knownFacts.find(f => 
          f.toLowerCase().includes(param.factName!.toLowerCase())
        );
        if (fact) {
          const parts = fact.split(':');
          value = parts.length > 1 ? parts[1].trim() : fact;
        }
      }
      
      if (!value && param.defaultValue) {
        value = param.defaultValue;
      }

      if (value) {
        resolvedParams[param.name] = value;
      } else if (param.required) {
        missingParameters.push(param);
      }
    }

    const processedSteps: GuiStep[] = tool.stepsTemplate.map(step => {
      let action = step.action;
      let description = step.description;

      for (const [key, val] of Object.entries(resolvedParams)) {
        action = action.replace(new RegExp(`{{${key}}}`, 'g'), val);
        description = description.replace(new RegExp(`{{${key}}}`, 'g'), val);
      }

      return {
        ...step,
        action,
        description
      };
    });

    return {
      steps: missingParameters.length === 0 ? processedSteps : [],
      toolId: tool.id,
      missingParameters,
      explanation: tool.description
    };
  }
}
