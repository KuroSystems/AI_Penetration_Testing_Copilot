import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

export const sessionsApi = {
  list: () => api.get('/sessions').then(res => res.data),
  get: (id: string) => api.get(`/sessions/${id}`).then(res => res.data),
  create: (target: string, name?: string, workflowId?: string) => api.post('/sessions', { target, name, workflowId }).then(res => res.data),
  updateState: (id: string, state: any) => api.patch(`/sessions/${id}/state`, state).then(res => res.data),
  getAudit: (id: string) => api.get(`/sessions/${id}/audit`).then(res => res.data),
};

export const configApi = {
  get: () => api.get('/config').then(res => res.data),
  update: (config: any) => api.patch('/config', config).then(res => res.data),
};

export const promptsApi = {
  list: () => api.get('/prompts').then(res => res.data),
  reload: () => api.post('/prompts/reload').then(res => res.data),
};

export const modelsApi = {
  listAvailable: () => api.get('/models/available').then(res => res.data),
  pull: (modelName: string) => api.post('/models/pull', { modelName }).then(res => res.data),
};

export const knowledgeApi = {
  listPacks: () => api.get('/knowledge/packs').then(res => res.data),
  reload: () => api.post('/knowledge/reload').then(res => res.data),
};

export const workflowApi = {
  list: () => api.get('/workflows').then(res => res.data),
  reload: () => api.post('/workflows/reload').then(res => res.data),
};

export const auditApi = {
  verify: () => api.get('/audit/verify').then(res => res.data),
};

export const rulesApi = {
  list: () => api.get('/rules').then(res => res.data),
  reload: () => api.post('/rules/reload').then(res => res.data),
};
