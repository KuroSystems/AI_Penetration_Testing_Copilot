import { 
  ToolDefinition, 
  GeneratedCommand, 
  Session,
  ToolParameter
} from '@ai-pentest/contracts';

export class CommandGenerationEngine {
  public generate(tool: ToolDefinition, session: Session, userInputs: Record<string, string> = {}): GeneratedCommand {
    let command = tool.commandTemplate;
    const missingParameters: ToolParameter[] = [];
    
    for (const param of tool.parameters) {
      let value: string | undefined;

      // 1. Check user inputs
      if (userInputs[param.name]) {
        value = userInputs[param.name];
      } 
      // 2. Check session target
      else if (param.source === 'session_target') {
        value = session.target;
      }
      // 3. Check session facts
      else if (param.source === 'session_fact' && param.factName) {
        // Simple search in facts
        const fact = session.state.knownFacts.find(f => 
          f.toLowerCase().includes(param.factName!.toLowerCase())
        );
        if (fact) {
          // Attempt to extract value from fact (very naive for now)
          const parts = fact.split(':');
          value = parts.length > 1 ? parts[1].trim() : fact;
        }
      }
      
      // 4. Use default value
      if (!value && param.defaultValue) {
        value = param.defaultValue;
      }

      if (value) {
        command = command.replace(new RegExp(`{{${param.name}}}`, 'g'), value);
      } else if (param.required) {
        missingParameters.push(param);
      }
    }

    return {
      command: missingParameters.length === 0 ? command : '',
      toolId: tool.id,
      missingParameters,
      explanation: tool.description
    };
  }
}
