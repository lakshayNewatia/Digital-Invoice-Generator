import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { apiListInvoices, apiUpdateInvoice } from '@/lib/invoicesApi';
import { apiDownloadInvoicePdf } from '@/lib/pdfApi';
import { useAuth } from '@/state/auth.jsx';
import { useMoney } from '@/lib/money.js';

const TEMPLATES = [
  {
    key: 'classic',
    name: 'Classic',
    desc: 'Traditional invoice layout with clear hierarchy.',
  },
  {
    key: 'modern',
    name: 'Modern',
    desc: 'Clean, contemporary header and spacing.',
  },
  {
    key: 'minimal',
    name: 'Minimal',
    desc: 'Ultra simple, distraction-free structure.',
  },
  {
    key: 'executive',
    name: 'Executive',
    desc: 'Formal, premium styling with emphasis on totals.',
  },
  {
    key: 'bold',
    name: 'Bold',
    desc: 'High contrast header with strong sectioning.',
  },
];

function SelectInvoiceTemplate() {
  const { id } = useParams();
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const { token } = useAuth();
  const money = useMoney();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [invoices, setInvoices] = useState([]);

  const [selectedTemplate, setSelectedTemplate] = useState('classic');
  const [isSaving, setIsSaving] = useState(false);
  const [isPdfBusy, setIsPdfBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError('');

    apiListInvoices(token)
      .then((data) => {
        if (cancelled) return;
        setInvoices(Array.isArray(data) ? data : []);
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
    return invoices.find((x) => String(x._id) === String(id)) || null;
  }, [invoices, id]);

  const isLocked = useMemo(() => {
    if (!invoice) return false;
    const s = String(invoice.status || 'pending').toLowerCase();
    if (s === 'paid') return true;
    if (s === 'sent') return true;
    if (invoice.locked) return true;
    return false;
  }, [invoice]);

  useEffect(() => {
    if (!invoice) return;
    if (invoice.templateKey) setSelectedTemplate(String(invoice.templateKey));
  }, [invoice]);

  const onPreviewPdf = async () => {
    if (!invoice?._id) return;
    setNotice('');
    setError('');
    setIsPdfBusy(true);
    try {
      // Save template selection only if invoice is still editable.
      if (!isLocked) {
        await apiUpdateInvoice(token, invoice._id, { templateKey: selectedTemplate });
      }

      const { url } = await apiDownloadInvoicePdf(token, invoice._id, money.currency);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice.invoiceNumber || invoice._id}-${selectedTemplate}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setNotice('PDF preview download started.');
    } catch (err) {
      setError(err?.message || 'Failed to preview PDF');
    } finally {
      setIsPdfBusy(false);
    }
  };

  const onFinalize = async () => {
    if (!invoice?._id) return;
    if (isLocked) {
      navigate(`/invoices/${invoice._id}`);
      return;
    }
    setNotice('');
    setError('');
    setIsSaving(true);
    try {
      await apiUpdateInvoice(token, invoice._id, { templateKey: selectedTemplate, status: 'sent' });
      navigate(`/invoices/${invoice._id}`);
    } catch (err) {
      setError(err?.message || 'Failed to finalize invoice');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-10">
      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={reduceMotion ? undefined : { duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-8 shadow-soft"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_30%_0%,rgba(34,197,94,0.16),rgba(7,10,18,0))]" />
        <div className="relative space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Finalize</div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">Choose a PDF template</h1>
          <p className="max-w-2xl text-sm text-white/65">Pick a professional layout, preview, then finalize the invoice.</p>
        </div>
      </motion.div>

      {error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-6 py-4 text-sm text-rose-200">{error}</div>
      ) : null}

      {notice ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-4 text-sm text-emerald-200">{notice}</div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="ds-panel overflow-hidden lg:col-span-3">
          <div className="border-b border-white/10 bg-white/5 p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Templates</div>
            <div className="mt-2 font-display text-2xl font-semibold tracking-tight">Select one</div>
            <div className="mt-1 text-sm text-white/60">Template is saved to the invoice as <span className="text-white/75">templateKey</span>.</div>
          </div>

          <div className="divide-y divide-white/10">
            {isLoading ? (
              <div className="p-6 text-sm text-white/60">Loading…</div>
            ) : invoice ? (
              TEMPLATES.map((t) => {
                const active = selectedTemplate === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => {
                      if (isLocked) return;
                      setSelectedTemplate(t.key);
                    }}
                    disabled={isLocked}
                    className={`w-full text-left p-6 transition ${
                      active ? 'bg-white/10' : isLocked ? '' : 'hover:bg-white/5'
                    } ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-white/85">{t.name}</div>
                        <div className="mt-1 text-sm text-white/60">{t.desc}</div>
                      </div>
                      <div className={`h-3 w-3 rounded-full border ${active ? 'bg-emerald-400 border-emerald-300/60' : 'border-white/20'}`} />
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-6">
                <div className="text-sm font-semibold text-white/80">Invoice not found</div>
                <div className="mt-1 text-sm text-white/60">Go back to the dashboard and try again.</div>
              </div>
            )}
          </div>
        </div>

        <div className="ds-panel overflow-hidden lg:col-span-2">
          <div className="border-b border-white/10 bg-white/5 p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Summary</div>
            <div className="mt-2 font-display text-2xl font-semibold tracking-tight">Review</div>
          </div>

          <div className="space-y-4 p-6">
            {invoice ? (
              <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Invoice</div>
                <div className="mt-2 text-sm font-semibold text-white/85">{invoice.invoiceNumber || invoice._id}</div>
                <div className="mt-1 text-xs text-white/55">
                  Status: {String(invoice.status || 'pending') === 'pending' ? 'draft' : String(invoice.status || 'pending')}
                </div>
                <div className="mt-2 text-sm font-semibold tabular-nums text-white/85">{money.formatFromInr(Number(invoice.total || 0))}</div>
              </div>
            ) : null}

            <button type="button" className="ds-btn-secondary w-full" onClick={onPreviewPdf} disabled={isPdfBusy || !invoice}>
              {isPdfBusy ? 'Preparing preview…' : 'Preview PDF (download)'}
            </button>

            <button type="button" className="ds-btn-primary w-full" onClick={onFinalize} disabled={isSaving || !invoice || isLocked}>
              {isLocked ? 'Invoice locked (already sent/paid)' : isSaving ? 'Finalizing…' : 'Finalize (mark as sent)'}
            </button>

            <div className="flex items-center justify-between gap-3">
              <Link to={invoice ? `/invoices/${invoice._id}` : '/dashboard'} className="ds-btn-secondary h-10 px-3 inline-flex items-center">
                Back
              </Link>
              <Link to="/dashboard" className="ds-btn-secondary h-10 px-3 inline-flex items-center">
                Dashboard
              </Link>
            </div>

            <div className="text-xs text-white/55">
              {isLocked
                ? 'This invoice is already locked. You can still download the PDF from here or from Invoice Detail.'
                : (
                  <>
                    Finalizing sets status to <span className="text-white/75">sent</span> and locks totals/tax. Email can be sent from Invoice Detail.
                  </>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SelectInvoiceTemplate;
