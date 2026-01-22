console.log('ENV CHECK →', import.meta.env);


const API_ERROR_FALLBACK = 'Request failed. Please try again.';

// ✅ API base (dev + prod safe)
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');


export async function http(path, { token, method = 'GET', body, headers } = {}) {
  const baseHeaders = {
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: baseHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson
    ? await res.json().catch(() => null)
    : await res.text().catch(() => null);

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && (data.message || data.error)) ||
      (typeof data === 'string' && data) ||
      API_ERROR_FALLBACK;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}
