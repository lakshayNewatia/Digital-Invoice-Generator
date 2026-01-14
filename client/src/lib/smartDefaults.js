const STORAGE_KEYS = {
  lastClientId: 'dig-inv:lastClientId',
  lastPaymentTermsDays: 'dig-inv:lastPaymentTermsDays',
  lastInvoiceNumber: 'dig-inv:lastInvoiceNumber',
};

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function getLastClientId() {
  return safeGet(STORAGE_KEYS.lastClientId) || '';
}

export function setLastClientId(id) {
  if (!id) return;
  safeSet(STORAGE_KEYS.lastClientId, String(id));
}

export function getLastPaymentTermsDays() {
  const raw = safeGet(STORAGE_KEYS.lastPaymentTermsDays);
  const n = raw == null ? NaN : Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function setLastPaymentTermsDays(days) {
  const n = Number(days);
  if (!Number.isFinite(n) || n < 0) return;
  safeSet(STORAGE_KEYS.lastPaymentTermsDays, String(n));
}

export function getLastInvoiceNumber() {
  return safeGet(STORAGE_KEYS.lastInvoiceNumber) || '';
}

export function setLastInvoiceNumber(invoiceNumber) {
  const s = String(invoiceNumber || '').trim();
  if (!s) return;
  safeSet(STORAGE_KEYS.lastInvoiceNumber, s);
}

function parseInvoiceNumberPattern(value) {
  const s = String(value || '').trim();
  if (!s) return null;

  // Capture trailing number while keeping prefix untouched.
  // Examples:
  //  - INV-0007 => prefix "INV-", number "0007"
  //  - ACME-9 => prefix "ACME-", number "9"
  //  - 2025/INV/0012 => prefix "2025/INV/", number "0012"
  const match = s.match(/^(.*?)(\d+)$/);
  if (!match) return null;

  const prefix = match[1];
  const numStr = match[2];
  const num = Number(numStr);
  if (!Number.isFinite(num)) return null;

  return { prefix, num, width: numStr.length };
}

function formatWithPattern(prefix, num, width) {
  const n = Math.max(0, Math.floor(num));
  const numStr = String(n).padStart(width, '0');
  return `${prefix}${numStr}`;
}

export function suggestNextInvoiceNumber(invoices, opts = {}) {
  const seed = String(opts.seed || '').trim();
  const fallbackPrefix = String(opts.fallbackPrefix || 'INV-');
  const fallbackStart = Number.isFinite(opts.fallbackStart) ? opts.fallbackStart : 1001;

  const seedPattern = parseInvoiceNumberPattern(seed);

  // If we have a seed pattern, prefer incrementing within that pattern.
  if (seedPattern) {
    const { prefix, width } = seedPattern;
    let max = seedPattern.num;

    for (const inv of Array.isArray(invoices) ? invoices : []) {
      const invNo = inv?.invoiceNumber;
      const p = parseInvoiceNumberPattern(invNo);
      if (!p) continue;
      if (p.prefix !== prefix) continue;
      max = Math.max(max, p.num);
    }

    return formatWithPattern(prefix, max + 1, width);
  }

  // Otherwise, try to find any numeric invoice numbers and increment the max.
  let maxAny = 0;
  let maxAnyWidth = 0;

  for (const inv of Array.isArray(invoices) ? invoices : []) {
    const p = parseInvoiceNumberPattern(inv?.invoiceNumber);
    if (!p) continue;
    if (p.num > maxAny) {
      maxAny = p.num;
      maxAnyWidth = p.width;
    }
  }

  if (maxAny > 0) {
    return formatWithPattern(fallbackPrefix, maxAny + 1, Math.max(1, maxAnyWidth));
  }

  return formatWithPattern(fallbackPrefix, fallbackStart, String(fallbackStart).length);
}

export function computeDueDateFromTerms(days, fromDate = new Date()) {
  const d = new Date(fromDate);
  const n = Number(days);
  if (!Number.isFinite(n) || n < 0) return null;
  d.setDate(d.getDate() + Math.floor(n));
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
