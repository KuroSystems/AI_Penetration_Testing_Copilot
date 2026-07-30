export * from './interfaces/session';
export * from './interfaces/prompt';
export * from './interfaces/message';
export * from './interfaces/plugin';
export * from './interfaces/model';

// We can also export JSON schemas as objects if needed
import * as sessionSchema from './schemas/session.schema.json';
import * as promptSchema from './schemas/prompt.schema.json';
import * as messageSchema from './schemas/message.schema.json';
import * as pluginSchema from './schemas/plugin.schema.json';

export const Schemas = {
  Session: sessionSchema,
  Prompt: promptSchema,
  Message: messageSchema,
  Plugin: pluginSchema
};
