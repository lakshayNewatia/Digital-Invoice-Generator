import { http } from './http';

export function apiListItems(token) {
  return http('/api/items', { token });
}

export function apiCreateItem(token, payload) {
  return http('/api/items', { token, method: 'POST', body: payload });
}

export function apiUpdateItem(token, id, payload) {
  return http(`/api/items/${id}`, { token, method: 'PUT', body: payload });
}

export function apiDeleteItem(token, id) {
  return http(`/api/items/${id}`, { token, method: 'DELETE' });
}
