import { useMemo } from 'react';
import { useCurrency } from '@/state/currency.jsx';

function formatMoneyRaw(value, currency) {
  const n = Number(value || 0);
  const code = String(currency || 'INR').toUpperCase();
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${code} ${n.toFixed(2)}`;
  }
}

export function useMoney() {
  const { currency, rate } = useCurrency();

  return useMemo(() => {
    return {
      currency,
      rate,
      convertFromInr: (valueInInr) => Number(valueInInr || 0) * Number(rate || 1),
      formatFromInr: (valueInInr) => formatMoneyRaw(Number(valueInInr || 0) * Number(rate || 1), currency),
      format: (valueAlreadyInCurrency) => formatMoneyRaw(valueAlreadyInCurrency, currency),
    };
  }, [currency, rate]);
}
