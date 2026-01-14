export async function apiDownloadInvoicePdf(token, invoiceId, currency) {
  const qs = currency ? `?currency=${encodeURIComponent(currency)}` : '';
  const res = await fetch(`/api/pdf/${invoiceId}/generate${qs}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'Failed to download PDF');
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  return { url, blob };
}
