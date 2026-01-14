export async function apiGetInvoiceEmailDraft(token, invoiceId, currency) {
  const qs = currency ? `?currency=${encodeURIComponent(currency)}` : '';
  const res = await fetch(`/api/email/${invoiceId}/draft${qs}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'Failed to load email draft');
  }

  return res.json();
}

export async function apiSendInvoiceEmailCustom(token, invoiceId, payload, currency) {
  const qs = currency ? `?currency=${encodeURIComponent(currency)}` : '';
  const res = await fetch(`/api/email/${invoiceId}/send-custom${qs}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload || {}),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'Failed to send custom email');
  }

  const text = await res.text().catch(() => '');
  if (!text) return { message: 'Email sent successfully' };
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export async function apiListInvoiceEmailHistory(token, invoiceId) {
  const res = await fetch(`/api/email/${invoiceId}/history`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'Failed to load invoice email history');
  }

  return res.json();
}

export async function apiListEmailHistory(token) {
  const res = await fetch(`/api/email/history`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'Failed to load email history');
  }

  return res.json();
}
