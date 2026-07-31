import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

export const sessionsApi = {
  list: () => api.get('/sessions').then(res => res.data),
  get: (id: string) => api.get(`/sessions/${id}`).then(res => res.data),
  create: (target: string, name?: string) => api.post('/sessions', { target, name }).then(res => res.data),
};

export const configApi = {
  get: () => api.get('/config').then(res => res.data),
  update: (config: any) => api.patch('/config', config).then(res => res.data),
};
