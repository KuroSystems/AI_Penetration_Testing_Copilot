export enum AgentRole {
  MENTOR = 'mentor', // The primary agent recommending actions
  REVIEWER = 'reviewer', // An agent that reviews and validates recommendations
  RECON_SPECIALIST = 'recon_specialist',
  EXPLOIT_SPECIALIST = 'exploit_specialist'
}

export interface Agent {
  id: string;
  role: AgentRole;
  process(context: any): Promise<any>;
}

export interface AgentMessage {
  from: string;
  to: string;
  role: AgentRole;
  content: any;
  timestamp: Date;
}
