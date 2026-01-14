import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { apiListInvoices } from '@/lib/invoicesApi';
import { apiListClients } from '@/lib/clientsApi';
import { useAuth } from '@/state/auth.jsx';
import { useMoney } from '@/lib/money.js';
import { getInvoiceLifecycle } from '@/lib/invoiceIntelligence.js';
import { formatDateDDMMYYYY } from '@/lib/date.js';

function StatusPill({ status }) {
  const s = String(status || 'pending').toLowerCase();
  const tone = s === 'paid' ? 'ds-status-paid' : s === 'overdue' ? 'ds-status-overdue' : 'ds-status-default';

  return (
    <span className={`ds-status ${tone}`}>
      {s}
    </span>
  );
}

function Kpi({ label, value, hint }) {
  return (
    <div className="ds-panel p-6">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">{label}</div>
      <div className="mt-2 font-display text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
      <div className="mt-1 text-sm text-white/60">{hint}</div>
    </div>
  );
}

function Dashboard() {
  const reduceMotion = useReducedMotion();
  const { token, user } = useAuth();
  const money = useMoney();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError('');

    Promise.all([apiListInvoices(token), apiListClients(token)])
      .then(([inv, cli]) => {
        if (cancelled) return;
        setInvoices(Array.isArray(inv) ? inv : []);
        setClients(Array.isArray(cli) ? cli : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'Failed to load dashboard');
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
      if (c && c._id) map.set(String(c._id), c);
    }
    return map;
  }, [clients]);

  const enriched = useMemo(() => {
    return (Array.isArray(invoices) ? invoices : []).map((inv) => {
      const intel = getInvoiceLifecycle(inv);
      const client = inv?.client ? clientById.get(String(inv.client)) : null;
      return {
        ...inv,
        computedStatus: intel.computedStatus,
        lifecycleLabels: intel.labels,
        clientName: client?.name || (inv?.client ? String(inv.client).slice(-6) : '—'),
      };
    });
  }, [invoices, clientById]);

  const kpis = useMemo(() => {
    let totalInvoiced = 0;
    let paid = 0;
    let unpaid = 0;
    let overdue = 0;

    for (const inv of enriched) {
      const total = Number(inv?.total || 0);
      totalInvoiced += total;
      if (inv.computedStatus === 'paid') {
        paid += total;
      } else if (inv.computedStatus === 'overdue') {
        overdue += total;
        unpaid += total;
      } else {
        unpaid += total;
      }
    }

    return {
      totalInvoiced,
      paid,
      unpaid,
      overdue,
      count: enriched.length,
    };
  }, [enriched]);

  const recent = useMemo(() => {
    return [...enriched]
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      .slice(0, 8);
  }, [enriched]);

  const enter = reduceMotion ? undefined : { opacity: 0, y: 16 };
  const show = reduceMotion ? undefined : { opacity: 1, y: 0 };

  return (
    <div className="space-y-10">
      <motion.div
        initial={enter}
        animate={show}
        transition={reduceMotion ? undefined : { duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-8 shadow-soft"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_30%_0%,rgba(34,197,94,0.22),rgba(7,10,18,0))]" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Command center</div>
            <h1 className="font-display text-4xl font-semibold tracking-tight">Dashboard</h1>
            <p className="max-w-2xl text-sm text-white/65">
              {user?.companyName ? user.companyName : user?.name ? `Welcome, ${user.name}.` : 'Welcome.'} You have{' '}
              <span className="font-semibold text-white/85">{kpis.count}</span> invoices in the system.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/invoices/new" className="ds-btn-primary">
              Create invoice
            </Link>
            <Link to="/clients" className="ds-btn-secondary">
              Manage clients
            </Link>
          </div>
        </div>
      </motion.div>

      {error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-6 py-4 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={reduceMotion ? undefined : { duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <Kpi label="Total invoiced" value={money.formatFromInr(kpis.totalInvoiced)} hint="All time" />
        <Kpi label="Paid" value={money.formatFromInr(kpis.paid)} hint="Settled" />
        <Kpi label="Unpaid" value={money.formatFromInr(kpis.unpaid)} hint="Pending + overdue" />
        <Kpi label="Overdue" value={money.formatFromInr(kpis.overdue)} hint="Past due" />
      </motion.div>

      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={reduceMotion ? undefined : { duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
        className="ds-panel overflow-hidden"
      >
        <div className="flex items-end justify-between gap-6 border-b border-white/10 bg-white/5 p-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Activity</div>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">Recent invoices</h2>
            <p className="mt-1 text-sm text-white/60">A fast read of what’s moving.</p>
          </div>
          <div className="text-xs text-white/55">{isLoading ? 'Syncing…' : 'Live from API'}</div>
        </div>

        <div className="divide-y divide-white/10">
          {isLoading ? (
            <div className="p-6 text-sm text-white/60">Loading invoices…</div>
          ) : recent.length ? (
            recent.map((inv) => (
              <div key={inv._id} className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="font-display text-lg font-semibold tracking-tight">{inv.invoiceNumber}</div>
                    <StatusPill status={inv.computedStatus} />
                    {Array.isArray(inv.lifecycleLabels) && inv.lifecycleLabels.length ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {inv.lifecycleLabels.map((label) => (
                          <span
                            key={label}
                            className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/70"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-sm text-white/65">
                    <span className="font-semibold text-white/80">{inv.clientName}</span>
                    <span className="text-white/40"> · </span>
                    <span>Due {formatDateDDMMYYYY(inv.dueDate)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-6 sm:justify-end">
                  <div className="text-right">
                    <div className="font-display text-xl font-semibold tabular-nums">{money.formatFromInr(inv.total)}</div>
                    <div className="text-xs text-white/55">total</div>
                  </div>
                  <Link to={`/invoices/${inv._id}`} className="ds-btn-secondary h-10 px-3">
                    Open
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6">
              <div className="text-sm font-semibold text-white/80">No invoices yet</div>
              <div className="mt-1 text-sm text-white/60">Create your first invoice to start tracking payments and due dates.</div>
              <div className="mt-4">
                <Link to="/invoices/new" className="ds-btn-primary h-10 px-3 inline-flex items-center">
                  Create your first invoice
                </Link>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default Dashboard;
