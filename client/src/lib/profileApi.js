export async function apiUpdateProfile(
  token,
  {
    companyName,
    companyLogoFile,
    companyAddress,
    companyEmail,
    companyPhone,
    companyTaxId,
    defaultTaxName,
    defaultTaxRate,
    taxMode,
    paymentTermsDays,
  },
) {
  const form = new FormData();
  if (companyName != null) form.append('companyName', companyName);
  if (companyLogoFile) form.append('companyLogo', companyLogoFile);
  if (companyAddress != null) form.append('companyAddress', companyAddress);
  if (companyEmail != null) form.append('companyEmail', companyEmail);
  if (companyPhone != null) form.append('companyPhone', companyPhone);
  if (companyTaxId != null) form.append('companyTaxId', companyTaxId);
  if (defaultTaxName != null) form.append('defaultTaxName', defaultTaxName);
  if (defaultTaxRate != null) form.append('defaultTaxRate', String(defaultTaxRate));
  if (taxMode != null) form.append('taxMode', taxMode);
  if (paymentTermsDays != null) form.append('paymentTermsDays', String(paymentTermsDays));

  const res = await fetch('/api/users/profile', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && (data.message || data.error)) ||
      (typeof data === 'string' && data) ||
      'Failed to update profile';
    throw new Error(message);
  }

  return data;
}
