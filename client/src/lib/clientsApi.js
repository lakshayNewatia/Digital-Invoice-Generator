import { http } from './http';

export function apiListClients(token) {
  return http('/api/clients', { token });
}

export function apiCreateClient(token, payload) {
  return http('/api/clients', { token, method: 'POST', body: payload });
}

export function apiUpdateClient(token, id, payload) {
  return http(`/api/clients/${id}`, { token, method: 'PUT', body: payload });
}

export function apiDeleteClient(token, id) {
  return http(`/api/clients/${id}`, { token, method: 'DELETE' });
}
