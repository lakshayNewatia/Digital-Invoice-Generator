export async function apiGetFxLatest() {
  const res = await fetch('/api/fx/latest');
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'Failed to fetch FX rates');
  }
  return res.json();
}
