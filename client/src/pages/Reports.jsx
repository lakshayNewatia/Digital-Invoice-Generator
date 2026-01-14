import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { apiListInvoices } from '@/lib/invoicesApi';
import { apiListClients } from '@/lib/clientsApi';
import { useAuth } from '@/state/auth.jsx';
import { useMoney } from '@/lib/money.js';
import { getInvoiceLifecycle } from '@/lib/invoiceIntelligence.js';

function formatDateForCsv(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  // Excel sometimes renders date cells as ##### depending on column width/format.
  // Force text by prefixing apostrophe (Excel hides it in display).
  return `'${d.toISOString().slice(0, 10)}`;
}

function DonutChart({ items, size = 164, stroke = 18, activeKey, onSelect }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = items.reduce((sum, it) => sum + Number(it.value || 0), 0);

  const segments = items
    .filter((x) => Number(x.value || 0) > 0)
    .reduce((acc, it) => {
      const v = Number(it.value || 0);
      const frac = total ? v / total : 0;
      const len = frac * c;
      const dasharray = `${len} ${c - len}`;
      const dashoffset = -acc.offset;
      acc.list.push({ key: it.key, color: it.color, dasharray, dashoffset });
      acc.offset += len;
      return acc;
    }, { offset: 0, list: [] });

  const list = segments.list;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgb(var(--border) / 0.18)"
        strokeWidth={stroke}
      />
      {list.map((seg) => (
        <circle
          key={seg.key}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={seg.color}
          strokeWidth={stroke}
          strokeDasharray={seg.dasharray}
          strokeDashoffset={seg.dashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          opacity={!activeKey || activeKey === seg.key ? 1 : 0.35}
          style={{ cursor: onSelect ? 'pointer' : undefined }}
          onClick={
            onSelect
              ? () => {
                  onSelect(seg.key);
                }
              : undefined
          }
        />
      ))}
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-current"
        style={{ fill: 'rgb(var(--fg) / 0.90)' }}
      >
        <tspan className="font-display" style={{ fontSize: 20, fontWeight: 700 }}>
          {total}
        </tspan>
        <tspan x={size / 2} dy={20} style={{ fontSize: 11, fontWeight: 600, fill: 'rgb(var(--fg) / 0.60)' }}>
          invoices
        </tspan>
      </text>
    </svg>
  );
}

function Reports() {
  const reduceMotion = useReducedMotion();
  const { token } = useAuth();
  const money = useMoney();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [activeStatusKey, setActiveStatusKey] = useState(null);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const applyPreset = (key) => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const toInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (key === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setFrom(toInput(start));
      setTo(toInput(end));
      return;
    }

    if (key === '30d') {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      setFrom(toInput(start));
      setTo(toInput(now));
      return;
    }

    if (key === '7d') {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      setFrom(toInput(start));
      setTo(toInput(now));
      return;
    }
  };

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError('');

    Promise.all([apiListInvoices(token), apiListClients(token)])
      .then(([inv, cl]) => {
        if (cancelled) return;
        setInvoices(Array.isArray(inv) ? inv : []);
        setClients(Array.isArray(cl) ? cl : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'Failed to load reports');
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const clientById = useMemo(() => {
    const map = new Map();
    for (const c of clients) {
      if (c?._id) map.set(String(c._id), c);
    }
    return map;
  }, [clients]);

  const filtered = useMemo(() => {
    const start = from ? new Date(from).getTime() : null;
    const end = to ? new Date(to).getTime() : null;

    return invoices.filter((inv) => {
      const ts = inv?.date ? new Date(inv.date).getTime() : 0;
      if (start && ts < start) return false;
      if (end && ts > end + 24 * 60 * 60 * 1000 - 1) return false;
      return true;
    });
  }, [invoices, from, to]);

  const summary = useMemo(() => {
    let total = 0;
    let paid = 0;
    let unpaid = 0;
    let overdue = 0;
    let dueSoon = 0;
    let taxTotal = 0;
    const taxByName = new Map();

    for (const inv of filtered) {
      const amount = Number(inv?.total || 0);
      total += amount;
      const intel = getInvoiceLifecycle(inv);

      const t = Number(inv?.taxTotal || 0);
      if (Number.isFinite(t) && t > 0) {
        taxTotal += t;
        const name = String(inv?.taxSnapshot?.tax?.name || inv?.taxSnapshot?.name || 'Tax').trim() || 'Tax';
        taxByName.set(name, (taxByName.get(name) || 0) + t);
      }

      if (intel.computedStatus === 'paid') {
        paid += amount;
      } else {
        unpaid += amount;
        if (intel.isOverdue) overdue += amount;
        if (intel.isDueSoon) dueSoon += amount;
      }
    }

    return { total, paid, unpaid, overdue, dueSoon, taxTotal, taxByName: Array.from(taxByName.entries()), count: filtered.length };
  }, [filtered]);

  const byStatus = useMemo(() => {
    const map = new Map();
    for (const inv of filtered) {
      const s = String(inv?.status || 'pending').toLowerCase();
      map.set(s, (map.get(s) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const statusMix = useMemo(() => {
    let paidCount = 0;
    let overdueCount = 0;
    let dueSoonCount = 0;
    let otherUnpaidCount = 0;

    for (const inv of filtered) {
      const intel = getInvoiceLifecycle(inv);
      if (intel.computedStatus === 'paid') {
        paidCount += 1;
      } else if (intel.isOverdue) {
        overdueCount += 1;
      } else if (intel.isDueSoon) {
        dueSoonCount += 1;
      } else {
        otherUnpaidCount += 1;
      }
    }

    return [
      { key: 'paid', label: 'Paid', value: paidCount, color: 'rgb(var(--glow-e) / 0.95)' },
      { key: 'overdue', label: 'Overdue', value: overdueCount, color: 'rgb(244 63 94 / 0.95)' },
      { key: 'dueSoon', label: 'Due soon', value: dueSoonCount, color: 'rgb(var(--glow-c) / 0.95)' },
      { key: 'unpaid', label: 'Other unpaid', value: otherUnpaidCount, color: 'rgb(var(--glow-b) / 0.95)' },
    ];
  }, [filtered]);

  const clientsForActiveStatus = useMemo(() => {
    if (!activeStatusKey) return [];

    const names = new Map();
    for (const inv of filtered) {
      const intel = getInvoiceLifecycle(inv);
      const matches =
        (activeStatusKey === 'paid' && intel.computedStatus === 'paid') ||
        (activeStatusKey === 'overdue' && intel.isOverdue) ||
        (activeStatusKey === 'dueSoon' && intel.isDueSoon) ||
        (activeStatusKey === 'unpaid' && intel.computedStatus !== 'paid' && !intel.isOverdue && !intel.isDueSoon);

      if (!matches) continue;
      const clientId = String(inv?.client?._id || inv?.client || '');
      const client = clientById.get(clientId);
      const name = String(client?.name || inv?.client?.name || clientId || '');
      if (!name) continue;
      names.set(name, (names.get(name) || 0) + 1);
    }

    return Array.from(names.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [activeStatusKey, clientById, filtered]);

  const onExportCsv = () => {
    const rows = [
      ['Invoice', 'Client', 'Created', 'Due', 'Status', 'Total'],
      ...filtered.map((inv) => [
        String(inv?.invoiceNumber || inv?._id || ''),
        (() => {
          const clientId = String(inv?.client?._id || inv?.client || '');
          const client = clientById.get(clientId);
          return String(client?.name || inv?.client?.name || clientId || '');
        })(),
        formatDateForCsv(inv?.date),
        formatDateForCsv(inv?.dueDate),
        String(inv?.status || ''),
        String(Number(inv?.total || 0)),
      ]),
    ];

    const csv = rows
      .map((r) =>
        r
          .map((cell) => {
            const s = String(cell ?? '');
            const escaped = s.replaceAll('"', '""');
            return `"${escaped}"`;
          })
          .join(','),
      )
      .join('\n');

    // Add UTF-8 BOM for Excel.
    const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stamp = `${from || 'all'}_${to || 'all'}`.replaceAll(':', '-');
    a.download = `reports_${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  return (
    <div className="space-y-10">
      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={reduceMotion ? undefined : { duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgb(255_255_255_/_0.06),rgb(255_255_255_/_0.02))] p-8 shadow-soft"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_30%_0%,rgb(34_197_94_/_0.16),rgb(7_10_18_/_0))]" />
        <div className="relative space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Insights</div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">Reports</h1>
          <p className="max-w-2xl text-sm text-white/65">High-signal summaries backed by your invoices.</p>
        </div>
      </motion.div>

      {error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-6 py-4 text-sm text-rose-200">{error}</div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={reduceMotion ? undefined : { duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
          className="ds-panel overflow-hidden lg:col-span-2"
        >
          <div className="border-b border-white/10 bg-white/5 p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Filter</div>
            <div className="mt-2 font-display text-2xl font-semibold tracking-tight">Date range</div>
            <div className="mt-1 text-sm text-white/60">Uses invoice creation date (`invoice.date`).</div>
          </div>
          <div className="space-y-4 p-6">
            <div className="grid grid-cols-3 gap-2">
              <button type="button" className="ds-btn-secondary h-10 px-3" onClick={() => applyPreset('7d')}>
                Last 7d
              </button>
              <button type="button" className="ds-btn-secondary h-10 px-3" onClick={() => applyPreset('30d')}>
                Last 30d
              </button>
              <button type="button" className="ds-btn-secondary h-10 px-3" onClick={() => applyPreset('month')}>
                This month
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-white/85" htmlFor="from">From</label>
              <input id="from" className="ds-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-white/85" htmlFor="to">To</label>
              <input id="to" className="ds-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="ds-btn-secondary w-full"
                onClick={() => {
                  setFrom('');
                  setTo('');
                }}
              >
                Clear
              </button>
              <button type="button" className="ds-btn-primary w-full" onClick={onExportCsv} disabled={isLoading || !filtered.length}>
                Export CSV
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={reduceMotion ? undefined : { duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
          className="lg:col-span-3 space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="ds-panel p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Total invoiced</div>
              <div className="mt-2 font-display text-3xl font-semibold tracking-tight tabular-nums">{money.formatFromInr(summary.total)}</div>
              <div className="mt-1 text-sm text-white/60">Across <span className="font-semibold text-white/80 tabular-nums">{summary.count}</span> invoices</div>
            </div>
            <div className="ds-panel p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Paid</div>
              <div className="mt-2 font-display text-3xl font-semibold tracking-tight tabular-nums">{money.formatFromInr(summary.paid)}</div>
              <div className="mt-1 text-sm text-white/60">Settled amount</div>
            </div>
            <div className="ds-panel p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Unpaid</div>
              <div className="mt-2 font-display text-3xl font-semibold tracking-tight tabular-nums">{money.formatFromInr(summary.unpaid)}</div>
              <div className="mt-1 text-sm text-white/60">Pending + overdue</div>
            </div>
            <div className="ds-panel p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Overdue</div>
              <div className="mt-2 font-display text-3xl font-semibold tracking-tight tabular-nums">{money.formatFromInr(summary.overdue)}</div>
              <div className="mt-1 text-sm text-white/60">Past due date</div>
            </div>
            {summary.dueSoon ? (
              <div className="ds-panel p-6 md:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Due soon</div>
                <div className="mt-2 font-display text-3xl font-semibold tracking-tight tabular-nums">{money.formatFromInr(summary.dueSoon)}</div>
                <div className="mt-1 text-sm text-white/60">Invoices due within the next 7 days</div>
              </div>
            ) : null}

            <div className="ds-panel p-6 md:col-span-2">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Tax summary</div>
              <div className="mt-2 font-display text-3xl font-semibold tracking-tight tabular-nums">{money.formatFromInr(summary.taxTotal)}</div>
              <div className="mt-1 text-sm text-white/60">Total tax across invoices in this period</div>

              {Array.isArray(summary.taxByName) && summary.taxByName.length ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/30">
                  <div className="divide-y divide-white/10">
                    {summary.taxByName
                      .slice()
                      .sort((a, b) => b[1] - a[1])
                      .map(([name, amt]) => (
                        <div key={name} className="flex items-center justify-between p-4">
                          <div className="text-sm font-semibold text-white/80">{name}</div>
                          <div className="text-sm font-semibold tabular-nums text-white/85">{money.formatFromInr(amt)}</div>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-sm text-white/60">No tax recorded in this period.</div>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="ds-panel overflow-hidden">
              <div className="flex items-end justify-between gap-6 border-b border-white/10 bg-white/5 p-6">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Visualization</div>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">Status mix</h2>
                  <p className="mt-1 text-sm text-white/60">A quick read of what’s paid vs at risk.</p>
                </div>
                <div className="text-xs text-white/55">{isLoading ? 'Syncing…' : 'Live from API'}</div>
              </div>

              <div className="grid gap-5 p-6 sm:grid-cols-2 sm:items-center">
                <div className="flex justify-center sm:justify-start">
                  <DonutChart
                    items={statusMix}
                    activeKey={activeStatusKey}
                    onSelect={(key) => setActiveStatusKey((prev) => (prev === key ? null : key))}
                  />
                </div>
                <div className="space-y-3">
                  {statusMix.map((it) => (
                    <button
                      key={it.key}
                      type="button"
                      onClick={() => setActiveStatusKey((prev) => (prev === it.key ? null : it.key))}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-transparent px-2 py-1.5 text-left transition-colors hover:border-white/10 hover:bg-white/5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: it.color }} />
                        <div className="text-sm font-semibold text-white/85">{it.label}</div>
                      </div>
                      <div className="text-sm font-semibold tabular-nums text-white/85">{it.value}</div>
                    </button>
                  ))}

                  {activeStatusKey ? (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-white/85">Clients</div>
                        <button type="button" className="text-xs font-semibold text-white/55 hover:text-white/80" onClick={() => setActiveStatusKey(null)}>
                          Clear
                        </button>
                      </div>
                      <div className="mt-3 space-y-2">
                        {clientsForActiveStatus.length ? (
                          clientsForActiveStatus.slice(0, 12).map((row) => (
                            <div key={row.name} className="flex items-center justify-between gap-3">
                              <div className="text-sm font-semibold text-white/80">{row.name}</div>
                              <div className="text-xs font-semibold tabular-nums text-white/60">{row.count}</div>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-white/60">No clients in this segment.</div>
                        )}
                        {clientsForActiveStatus.length > 12 ? (
                          <div className="pt-2 text-xs text-white/55">Showing top 12. Narrow the date range to focus.</div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="ds-panel overflow-hidden">
              <div className="flex items-end justify-between gap-6 border-b border-white/10 bg-white/5 p-6">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Breakdown</div>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">Status counts</h2>
                  <p className="mt-1 text-sm text-white/60">Counts by original invoice status.</p>
                </div>
              </div>

              <div className="divide-y divide-white/10">
                {isLoading ? (
                  <div className="p-6 text-sm text-white/60">Loading…</div>
                ) : byStatus.length ? (
                  byStatus.map(([s, count]) => (
                    <div key={s} className="flex items-center justify-between p-6">
                      <div className="text-sm font-semibold text-white/85">{s}</div>
                      <div className="text-sm font-semibold tabular-nums text-white/85">{count}</div>
                    </div>
                  ))
                ) : (
                  <div className="p-6">
                    <div className="text-sm font-semibold text-white/80">No invoices in this date range</div>
                    <div className="mt-1 text-sm text-white/60">Try widening the dates, or create an invoice to generate data here.</div>
                    <div className="mt-4">
                      <Link to="/invoices/new" className="ds-btn-primary h-10 px-3 inline-flex items-center">
                        Create invoice
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default Reports;
