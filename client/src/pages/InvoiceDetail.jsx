import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { apiListInvoices } from '@/lib/invoicesApi';
import { apiListClients } from '@/lib/clientsApi';
import { apiListItems } from '@/lib/itemsApi';
import { apiDownloadInvoicePdf } from '@/lib/pdfApi';
import { useAuth } from '@/state/auth.jsx';
import { useMoney } from '@/lib/money.js';
import { getInvoiceLifecycle } from '@/lib/invoiceIntelligence.js';
import { formatDateDDMMYYYY } from '@/lib/date.js';

function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { token } = useAuth();
  const money = useMoney();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [items, setItems] = useState([]);
  const [isPdfBusy, setIsPdfBusy] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError('');

    Promise.all([apiListInvoices(token), apiListClients(token), apiListItems(token)])
      .then(([inv, cli, it]) => {
        if (cancelled) return;
        setInvoices(Array.isArray(inv) ? inv : []);
        setClients(Array.isArray(cli) ? cli : []);
        setItems(Array.isArray(it) ? it : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'Failed to load invoice');
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const invoice = useMemo(() => {
    return invoices.find((x) => String(x._id) === String(id));
  }, [invoices, id]);

  const client = useMemo(() => {
    if (!invoice?.client) return null;
    return clients.find((c) => String(c._id) === String(invoice.client)) || null;
  }, [clients, invoice]);

  const lineItems = useMemo(() => {
    const byId = new Map(items.map((i) => [String(i._id), i]));
    return (invoice?.items || []).map((itemId) => byId.get(String(itemId))).filter(Boolean);
  }, [invoice, items]);

  const computedLineTotal = useMemo(() => {
    return lineItems.reduce((sum, it) => sum + Number(it.quantity || 0) * Number(it.price || 0), 0);
  }, [lineItems]);

  const lifecycle = useMemo(() => {
    return invoice ? getInvoiceLifecycle(invoice) : null;
  }, [invoice]);

  const onDownloadPdf = async () => {
    if (!invoice?._id) return;
    setNotice('');
    setError('');
    setIsPdfBusy(true);
    try {
      const { url } = await apiDownloadInvoicePdf(token, invoice._id, money.currency);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice.invoiceNumber || invoice._id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setNotice('PDF download started.');
    } catch (err) {
      setError(err?.message || 'Failed to download PDF');
    } finally {
      setIsPdfBusy(false);
    }
  };

  const onSendEmail = () => {
    if (!invoice?._id) return;
    navigate(`/invoices/${invoice._id}/email`);
  };

  return (
    <div className="space-y-10">
      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={reduceMotion ? undefined : { duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="ds-panel overflow-hidden"
      >
        <div className="border-b border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Invoice</div>
              <div className="mt-2 font-display text-3xl font-semibold tracking-tight">
                {invoice?.invoiceNumber || 'Invoice detail'}
              </div>
              <div className="mt-1 text-sm text-white/60">
                {client ? `${client.name} · ${client.email}` : invoice?.client ? `Client ${String(invoice.client).slice(-6)}` : '—'}
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/dashboard" className="ds-btn-secondary h-10 px-3">
                Back
              </Link>
              <Link to="/invoices/new" className="ds-btn-primary h-10 px-3">
                New invoice
              </Link>
            </div>
          </div>
        </div>

        <div className="p-6">
          {error ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          {notice ? (
            <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">
              {notice}
            </div>
          ) : null}

          {isLoading ? (
            <div className="text-sm text-white/60">Loading…</div>
          ) : !invoice ? (
            <div className="text-sm text-white/60">Invoice not found.</div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <div className="rounded-2xl border border-white/10 bg-black/30">
                  <div className="flex items-center justify-between border-b border-white/10 p-5">
                    <div className="text-sm font-semibold">Line items</div>
                    <div className="text-xs text-white/55">From item catalog</div>
                  </div>
                  <div className="divide-y divide-white/10">
                    {lineItems.length ? (
                      lineItems.map((it) => (
                        <div key={it._id} className="flex items-start justify-between gap-6 p-5">
                          <div>
                            <div className="text-sm font-semibold text-white/85">{it.description}</div>
                            <div className="mt-1 text-xs text-white/55">
                              Qty <span className="tabular-nums">{it.quantity}</span> · Price{' '}
                              <span className="tabular-nums">{money.formatFromInr(it.price)}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold tabular-nums text-white/85">
                              {money.formatFromInr(Number(it.quantity || 0) * Number(it.price || 0))}
                            </div>
                            <div className="text-xs text-white/55">line</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-5">
                        <div className="text-sm font-semibold text-white/80">No items attached</div>
                        <div className="mt-1 text-sm text-white/60">Add items to your catalog, then create a new invoice with selected items.</div>
                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                          <Link to="/settings" className="ds-btn-secondary h-10 px-3 inline-flex items-center">
                            Create items
                          </Link>
                          <Link to="/invoices/new" className="ds-btn-primary h-10 px-3 inline-flex items-center">
                            Create invoice
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Total</div>
                  {Number(invoice.taxTotal || 0) > 0 || invoice.taxSnapshot ? (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-sm text-white/70">
                        <span>Subtotal</span>
                        <span className="tabular-nums">{money.formatFromInr(invoice.subtotal ?? computedLineTotal)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-white/70">
                        <span>
                          {String(invoice.taxSnapshot?.tax?.name || invoice.taxSnapshot?.name || 'Tax')} 
                          {typeof invoice.taxSnapshot?.tax?.rate === 'number' ? `(${invoice.taxSnapshot.tax.rate}%)` : ''}
                        </span>
                        <span className="tabular-nums">{money.formatFromInr(invoice.taxTotal || 0)}</span>
                      </div>
                    </div>
                  ) : null}
                  <div className="mt-2 font-display text-3xl font-semibold tracking-tight tabular-nums">
                    {money.formatFromInr(invoice.total)}
                  </div>
                  <div className="mt-1 text-xs text-white/55">Version: v{Number(invoice.version || 1)}</div>
                  <div className="mt-1 text-xs text-white/55">
                    Computed items total: <span className="tabular-nums">{money.formatFromInr(computedLineTotal)}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Due date</div>
                  <div className="mt-2 text-sm font-semibold text-white/85">
                    {formatDateDDMMYYYY(invoice.dueDate)}
                  </div>
                  <div className="mt-1 text-xs text-white/55">Status: {String(lifecycle?.computedStatus || invoice.status || 'pending')}</div>
                  {Array.isArray(lifecycle?.labels) && lifecycle.labels.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {lifecycle.labels.map((label) => (
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

                <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Next actions</div>
                  <div className="mt-3 flex flex-col gap-2">
                    <button
                      type="button"
                      className="ds-btn-primary"
                      onClick={onDownloadPdf}
                      disabled={isPdfBusy}
                    >
                      {isPdfBusy ? 'Preparing PDF…' : 'Download PDF'}
                    </button>
                    <button
                      type="button"
                      className="ds-btn-secondary"
                      onClick={onSendEmail}
                    >
                      Send email
                    </button>
                    <div className="text-xs text-white/55">
                      Uses backend routes <span className="text-white/75">/api/pdf/:id/generate</span> and{' '}
                      <span className="text-white/75">/api/email/:id/send</span>.
                    </div>
                  </div>
                </div>

                {Array.isArray(invoice.history) && invoice.history.length ? (
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Version history</div>
                    <div className="mt-3 space-y-3">
                      {[...invoice.history]
                        .slice()
                        .reverse()
                        .slice(0, 6)
                        .map((h, idx) => {
                          const when = h?.changedAt ? new Date(h.changedAt).toLocaleString() : '';
                          const ver = Number(h?.version || 0);
                          return (
                            <div key={`${ver}-${idx}`} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-semibold text-white/85">v{ver || '—'}</div>
                                <div className="text-[11px] text-white/55">{when}</div>
                              </div>
                              <div className="mt-1 text-sm text-white/70">{String(h?.summary || 'Updated')}</div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default InvoiceDetail;
