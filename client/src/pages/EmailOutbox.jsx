import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '@/state/auth.jsx';
import { apiListEmailHistory } from '@/lib/emailApi.js';
import { formatDateDDMMYYYY } from '@/lib/date.js';

function EmailOutbox() {
  const reduceMotion = useReducedMotion();
  const { token } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await apiListEmailHistory(token);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || 'Failed to load email history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filtered = useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const to = Array.isArray(r.to) ? r.to.join(',') : '';
      const subj = String(r.subject || '');
      const inv = String(r.invoice || '');
      return `${to} ${subj} ${inv}`.toLowerCase().includes(q);
    });
  }, [rows, query]);

  const enter = reduceMotion ? undefined : { opacity: 0, y: 12 };
  const show = reduceMotion ? undefined : { opacity: 1, y: 0 };

  const getDeliveryBadge = (row) => {
    const rejected = Array.isArray(row?.rejected) ? row.rejected : [];
    if (String(row?.status) === 'failed' || rejected.length) {
      return <span className="ds-status ds-status-rejected">Rejected</span>;
    }
    return <span className="ds-status ds-status-accepted">Accepted</span>;
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={enter}
        animate={show}
        transition={reduceMotion ? undefined : { duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="ds-panel overflow-hidden"
      >
        <div className="flex flex-col gap-4 border-b border-white/10 bg-white/5 p-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Email</div>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Sent emails</h1>
            <p className="mt-1 text-sm text-white/60">Latest 200 email attempts.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" className="ds-btn-secondary h-10 px-3" onClick={load} disabled={isLoading}>
              Refresh
            </button>
            <input
              className="ds-input h-10 w-full sm:w-72"
              placeholder="Search by recipient / subject / invoice id"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {error ? <div className="p-6 text-sm text-rose-200">{error}</div> : null}

        <div className="divide-y divide-white/10">
          {isLoading ? (
            <div className="p-6 text-sm text-white/60">Loading…</div>
          ) : filtered.length ? (
            filtered.map((r) => (
              <div key={r._id} className="p-6">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-white/85">{String(r.subject || '—')}</div>
                      {getDeliveryBadge(r)}
                    </div>
                    <div className="text-sm text-white/70">To: {(r.to || []).join(', ') || '—'}</div>
                    <div className="text-xs text-white/55">
                      {formatDateDDMMYYYY(r.sentAt || r.createdAt)}
                    </div>
                    {r.errorMessage ? <div className="mt-1 text-xs text-rose-200">{String(r.errorMessage)}</div> : null}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Link to={`/invoices/${r.invoice}`} className="ds-btn-secondary h-10 px-3">
                      Open invoice
                    </Link>
                    <Link to={`/invoices/${r.invoice}/email`} className="ds-btn-primary h-10 px-3">
                      Compose again
                    </Link>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-sm text-white/60">No email history yet.</div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default EmailOutbox;
