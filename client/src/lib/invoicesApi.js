import { http } from './http';

export function apiListInvoices(token) {
  return http('/api/invoices', { token });
}

export function apiCreateInvoice(token, payload) {
  return http('/api/invoices', { token, method: 'POST', body: payload });
}

export function apiUpdateInvoice(token, id, payload) {
  return http(`/api/invoices/${id}`, { token, method: 'PUT', body: payload });
}

export function apiDeleteInvoice(token, id) {
  return http(`/api/invoices/${id}`, { token, method: 'DELETE' });
}
