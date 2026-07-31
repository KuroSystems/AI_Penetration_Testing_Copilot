export * from './interfaces/session';
export * from './interfaces/prompt';
export * from './interfaces/message';
export * from './interfaces/plugin';
export * from './interfaces/model';
export * from './interfaces/memory';
export * from './interfaces/reasoning';
export * from './interfaces/workflow';
export * from './interfaces/safety';
export * from './interfaces/tools';
export * from './interfaces/validation';
export * from './interfaces/formatter';
export * from './interfaces/audit';
export * from './interfaces/knowledge';
export * from './interfaces/config';

import * as sessionSchema from './schemas/session.schema.json';
import * as promptSchema from './schemas/prompt.schema.json';
import * as messageSchema from './schemas/message.schema.json';
import * as pluginSchema from './schemas/plugin.schema.json';
import * as decisionSchema from './schemas/decision.schema.json';
import * as workflowSchema from './schemas/workflow.schema.json';
import * as safetySchema from './schemas/safety.schema.json';
import * as toolSchema from './schemas/tool-catalog.schema.json';
import * as guiToolSchema from './schemas/gui-tool-catalog.schema.json';
import * as knowledgePackSchema from './schemas/knowledge-pack.schema.json';

export const Schemas = {
  Session: sessionSchema,
  Prompt: promptSchema,
  Message: messageSchema,
  Plugin: pluginSchema,
  Decision: decisionSchema,
  Workflow: workflowSchema,
  Safety: safetySchema,
  ToolCatalog: toolSchema,
  GuiToolCatalog: guiToolSchema,
  KnowledgePack: knowledgePackSchema
};
