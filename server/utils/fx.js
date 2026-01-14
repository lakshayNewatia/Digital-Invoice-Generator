const https = require('https');

let cache = {
  fetchedAt: 0,
  base: 'INR',
  date: null,
  rates: null,
};

const CACHE_TTL_MS = 10 * 60 * 1000;

function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(`FX request failed (${res.statusCode})`));
          }
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(err);
          }
        });
      })
      .on('error', reject);
  });
}

async function getLatestRatesInr() {
  const now = Date.now();
  if (cache.rates && now - cache.fetchedAt < CACHE_TTL_MS) return cache;

  // Uses a free, no-key public dataset.
  // Response example: { date: '2025-..', inr: { usd: 0.0119, eur: ... } }
  const url = 'https://latest.currency-api.pages.dev/v1/currencies/inr.json';
  const json = await httpsGetJson(url);
  const rates = json && json.inr ? json.inr : null;
  if (!rates) throw new Error('FX response missing INR rates');

  cache = {
    fetchedAt: now,
    base: 'INR',
    date: json.date || null,
    rates,
  };

  return cache;
}

function normalizeCurrencyCode(code) {
  return String(code || '').trim().toUpperCase();
}

function getRateFromInr(ratesInr, targetCurrency) {
  const target = normalizeCurrencyCode(targetCurrency);
  if (!target || target === 'INR') return 1;
  const key = target.toLowerCase();
  const rate = ratesInr && typeof ratesInr[key] === 'number' ? ratesInr[key] : null;
  if (!rate) throw new Error(`Unsupported currency: ${target}`);
  return rate;
}

module.exports = {
  getLatestRatesInr,
  getRateFromInr,
  normalizeCurrencyCode,
};
