import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CurrencyContext = createContext(null);

const SUPPORTED = [
  { code: 'INR', label: 'INR' },
  { code: 'USD', label: 'USD' },
  { code: 'EUR', label: 'EUR' },
  { code: 'GBP', label: 'GBP' },
  { code: 'JPY', label: 'JPY' },
  { code: 'AUD', label: 'AUD' },
  { code: 'CAD', label: 'CAD' },
];

function normalize(code) {
  return String(code || '').trim().toUpperCase();
}

function getInitialCurrency() {
  if (typeof window === 'undefined') return 'INR';
  const saved = window.localStorage.getItem('ui-currency');
  const normalized = normalize(saved);
  if (SUPPORTED.some((c) => c.code === normalized)) return normalized;
  return 'INR';
}

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState(getInitialCurrency);

  const [rates, setRates] = useState({ INR: 1 });
  const [ratesDate, setRatesDate] = useState(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState('');

  useEffect(() => {
    try {
      window.localStorage.setItem('ui-currency', currency);
    } catch {
      // ignore
    }
  }, [currency]);

  // Fetch rates on mount and periodically.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setRatesLoading(true);
      setRatesError('');
      try {
        const res = await fetch('/api/fx/latest');
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || 'Failed to fetch FX rates');
        }
        const json = await res.json();
        if (cancelled) return;
        const nextRates = json?.rates && typeof json.rates === 'object' ? json.rates : { INR: 1 };
        setRates({ INR: 1, ...nextRates });
        setRatesDate(json?.date || null);
      } catch (err) {
        if (cancelled) return;
        setRatesError(err?.message || 'Failed to fetch FX rates');
      } finally {
        if (!cancelled) {
          setRatesLoading(false);
        }
      }
    }

    load();
    const interval = window.setInterval(load, 10 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const value = useMemo(() => {
    const rate = Number(rates?.[currency] || 1);
    return {
      currency,
      setCurrency,
      supported: SUPPORTED,
      rates,
      ratesDate,
      ratesLoading,
      ratesError,
      rate,
    };
  }, [currency, rates, ratesDate, ratesLoading, ratesError]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
