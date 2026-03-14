const API_BASE = '/api';

let token = localStorage.getItem('nexusmsp_token');

function authHeaders() {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, opts);

  if (res.status === 401 || res.status === 403) {
    token = null;
    localStorage.removeItem('nexusmsp_token');
    window.location.reload();
    throw new Error('Session expired');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export function setToken(t) {
  token = t;
  if (t) localStorage.setItem('nexusmsp_token', t);
  else localStorage.removeItem('nexusmsp_token');
}

export function getToken() {
  return token;
}

// Auth
export const auth = {
  login: (email, password) => request('POST', '/auth/login', { email, password }),
  register: (email, password, name) => request('POST', '/auth/register', { email, password, name }),
};

// Connectors
export const connectors = {
  list: () => request('GET', '/connectors'),
  get: (id) => request('GET', `/connectors/${id}`),
  create: (data) => request('POST', '/connectors', data),
  update: (id, data) => request('PUT', `/connectors/${id}`, data),
  delete: (id) => request('DELETE', `/connectors/${id}`),
  discover: (id, data) => request('POST', `/connectors/${id}/discover`, data),
  fields: (id) => request('GET', `/connectors/${id}/fields`),
  updateField: (connId, fieldId, data) => request('PATCH', `/connectors/${connId}/fields/${fieldId}`, data),
};

// Clients
export const clients = {
  list: () => request('GET', '/clients'),
  get: (id) => request('GET', `/clients/${id}`),
  create: (data) => request('POST', '/clients', data),
  update: (id, data) => request('PUT', `/clients/${id}`, data),
  delete: (id) => request('DELETE', `/clients/${id}`),
  setCredentials: (id, data) => request('PUT', `/clients/${id}/credentials`, data),
  addContact: (id, data) => request('POST', `/clients/${id}/contacts`, data),
};

// Templates
export const templates = {
  list: () => request('GET', '/templates'),
  get: (id) => request('GET', `/templates/${id}`),
  create: (data) => request('POST', '/templates', data),
  update: (id, data) => request('PUT', `/templates/${id}`, data),
  delete: (id) => request('DELETE', `/templates/${id}`),
  run: (id, data) => request('POST', `/templates/${id}/run`, data),
};

// Schedules
export const schedules = {
  list: () => request('GET', '/schedules'),
  create: (data) => request('POST', '/schedules', data),
  update: (id, data) => request('PUT', `/schedules/${id}`, data),
  delete: (id) => request('DELETE', `/schedules/${id}`),
};

// Runs
export const runs = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/runs${qs ? `?${qs}` : ''}`);
  },
  get: (id) => request('GET', `/runs/${id}`),
};

// AI
export const ai = {
  nlQuery: (query, connectorIds) => request('POST', '/ai/nl-query', { query, connectorIds }),
  suggestFields: (currentColumns, connectorIds) =>
    request('POST', '/ai/suggest-fields', { currentColumns, connectorIds }),
};

// Settings
export const settings = {
  get: () => request('GET', '/settings'),
  update: (data) => request('PUT', '/settings', data),
};

// Health
export const health = () => fetch(`${API_BASE}/health`).then((r) => r.json());
