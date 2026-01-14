import { http } from './http';

export function apiRegister({ name, email, password }) {
  return http('/api/users', {
    method: 'POST',
    body: { name, email, password },
  });
}

export function apiLogin({ email, password }) {
  return http('/api/users/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function apiMe(token) {
  return http('/api/users/me', { token });
}
