const { getLatestRatesInr, getRateFromInr, normalizeCurrencyCode } = require('../utils/fx');

// GET /api/fx/latest?base=INR&symbols=USD,EUR
const getLatest = async (req, res) => {
  try {
    const base = normalizeCurrencyCode(req.query.base || 'INR');
    if (base !== 'INR') {
      return res.status(400).json({ message: 'Only base=INR is supported currently' });
    }

    const symbolsRaw = String(req.query.symbols || '').trim();
    const symbols = symbolsRaw
      ? symbolsRaw
          .split(',')
          .map((s) => normalizeCurrencyCode(s))
          .filter(Boolean)
      : [];

    const cached = await getLatestRatesInr();

    if (!symbols.length) {
      // Return a safe subset by default (keeps payload small)
      const defaults = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'];
      const out = {};
      for (const c of defaults) {
        out[c] = c === 'INR' ? 1 : getRateFromInr(cached.rates, c);
      }
      return res.status(200).json({ base: 'INR', date: cached.date, rates: out });
    }

    const out = {};
    for (const c of symbols) {
      out[c] = c === 'INR' ? 1 : getRateFromInr(cached.rates, c);
    }

    return res.status(200).json({ base: 'INR', date: cached.date, rates: out });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err?.message || 'Failed to fetch FX rates' });
  }
};

module.exports = { getLatest };
