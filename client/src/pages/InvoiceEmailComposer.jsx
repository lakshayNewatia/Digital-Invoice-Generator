import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '@/state/auth.jsx';
import { useMoney } from '@/lib/money.js';
import { apiGetInvoiceEmailDraft, apiListInvoiceEmailHistory, apiSendInvoiceEmailCustom } from '@/lib/emailApi.js';
import { formatDateDDMMYYYY } from '@/lib/date.js';

function splitEmails(value) {
  return String(value || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function joinEmails(arr) {
  return (Array.isArray(arr) ? arr : []).join(', ');
}

function EmailComposer() {
  const { id } = useParams();
  const reduceMotion = useReducedMotion();
  const { token } = useAuth();
  const money = useMoney();

  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [history, setHistory] = useState([]);

  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setError('');
    setNotice('');
    try {
      const [d, h] = await Promise.all([
        apiGetInvoiceEmailDraft(token, id, money.currency),
        apiListInvoiceEmailHistory(token, id),
      ]);
      setHistory(Array.isArray(h) ? h : []);

      const next = d?.draft;
      setTo(joinEmails(next?.to));
      setCc(joinEmails(next?.cc));
      setBcc(joinEmails(next?.bcc));
      setSubject(String(next?.subject || ''));
      setBodyText(String(next?.bodyText || ''));
    } catch (e) {
      setError(e?.message || 'Failed to load email composer');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!token || !id) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id, money.currency]);

  const canSend = useMemo(() => {
    return splitEmails(to).length > 0 && subject.trim() && bodyText.trim();
  }, [to, subject, bodyText]);

  const getDeliveryBadge = (row) => {
    const rejected = Array.isArray(row?.rejected) ? row.rejected : [];
    if (String(row?.status) === 'failed' || rejected.length) {
      return <span className="ds-status ds-status-rejected">Rejected</span>;
    }
    return <span className="ds-status ds-status-accepted">Accepted</span>;
  };

  const onSend = async () => {
    if (!canSend) return;
    setIsSending(true);
    setError('');
    setNotice('');
    try {
      const result = await apiSendInvoiceEmailCustom(
        token,
        id,
        {
          to: splitEmails(to),
          cc: splitEmails(cc),
          bcc: splitEmails(bcc),
          subject: subject.trim(),
          bodyText: bodyText.trim(),
        },
        money.currency,
      );

      const accepted = Array.isArray(result?.accepted) ? result.accepted : [];
      const rejected = Array.isArray(result?.rejected) ? result.rejected : [];

      if (accepted.length && !rejected.length) {
        setNotice(`Email sent successfully.`);
      } else if (accepted.length || rejected.length) {
        setNotice(rejected.length ? 'Email was rejected.' : 'Email sent successfully.');
      } else {
        setNotice(`Email sent successfully.`);
      }

      const h = await apiListInvoiceEmailHistory(token, id);
      setHistory(Array.isArray(h) ? h : []);
    } catch (e) {
      setError(e?.message || 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const enter = reduceMotion ? undefined : { opacity: 0, y: 12 };
  const show = reduceMotion ? undefined : { opacity: 1, y: 0 };

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
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Compose email</h1>
            <p className="mt-1 text-sm text-white/60">
              Invoice: <span className="font-semibold text-white/85">{id}</span>
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link to={`/invoices/${id}`} className="ds-btn-secondary h-10 px-3">
              Back to invoice
            </Link>
            <button type="button" className="ds-btn-primary h-10 px-3" onClick={onSend} disabled={!canSend || isSending || isLoading}>
              {isSending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>

        {error ? <div className="p-6 text-sm text-rose-200">{error}</div> : null}
        {notice ? <div className="p-6 text-sm text-emerald-200">{notice}</div> : null}

        <div className="grid gap-6 p-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-white/85" htmlFor="to">
                Recipient email
              </label>
              <input
                id="to"
                className="ds-input"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="client@example.com"
                inputMode="email"
                autoComplete="email"
              />
              <div className="text-xs text-white/55">Usually this is your client’s email. You can add multiple emails separated by commas.</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <button
                type="button"
                className="ds-btn-secondary h-10 px-3 w-full"
                onClick={() => setShowAdvanced((v) => !v)}
              >
                {showAdvanced ? 'Hide advanced (CC/BCC)' : 'Advanced: add CC/BCC'}
              </button>

              {showAdvanced ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white/85" htmlFor="cc">
                      CC
                    </label>
                    <input id="cc" className="ds-input" value={cc} onChange={(e) => setCc(e.target.value)} placeholder="cc@example.com" />
                    <div className="text-xs text-white/55">CC is visible to everyone in the email.</div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white/85" htmlFor="bcc">
                      BCC
                    </label>
                    <input id="bcc" className="ds-input" value={bcc} onChange={(e) => setBcc(e.target.value)} placeholder="bcc@example.com" />
                    <div className="text-xs text-white/55">BCC is hidden from other recipients.</div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-white/85" htmlFor="subject">
                Subject
              </label>
              <input id="subject" className="ds-input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Invoice…" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-white/85" htmlFor="body">
                Email content
              </label>
              <textarea
                id="body"
                className="ds-input h-56 resize-none py-3"
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Write your message…"
              />
              <div className="text-xs text-white/55">The invoice PDF will be attached automatically.</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Preview</div>
              <div className="mt-3 space-y-2">
                <div className="text-sm text-white/70">
                  <span className="font-semibold text-white/85">To:</span> {to || '—'}
                </div>
                {showAdvanced && cc ? (
                  <div className="text-sm text-white/70">
                    <span className="font-semibold text-white/85">CC:</span> {cc}
                  </div>
                ) : null}
                {showAdvanced && bcc ? (
                  <div className="text-sm text-white/70">
                    <span className="font-semibold text-white/85">BCC:</span> {bcc}
                  </div>
                ) : null}
                <div className="text-sm text-white/70">
                  <span className="font-semibold text-white/85">Subject:</span> {subject || '—'}
                </div>
                <div className="mt-3 whitespace-pre-wrap rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">
                  {bodyText || '—'}
                </div>
              </div>
            </div>

            <div className="ds-panel overflow-hidden">
              <div className="border-b border-white/10 bg-white/5 p-6">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">History</div>
                <div className="mt-2 font-display text-xl font-semibold tracking-tight">Sent emails</div>
                <div className="mt-1 text-sm text-white/60">Latest 50 attempts for this invoice.</div>
              </div>
              <div className="divide-y divide-white/10">
                {isLoading ? (
                  <div className="p-6 text-sm text-white/60">Loading…</div>
                ) : history.length ? (
                  history.slice(0, 8).map((h) => (
                    <div key={h._id} className="p-6">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-white/85">Sent</div>
                          {getDeliveryBadge(h)}
                        </div>
                        <div className="text-xs text-white/55">{formatDateDDMMYYYY(h.sentAt || h.createdAt)}</div>
                      </div>
                      <div className="mt-1 text-sm text-white/70">To: {(h.to || []).join(', ') || '—'}</div>
                      <div className="mt-1 text-sm text-white/70">Subject: {String(h.subject || '—')}</div>
                      {h.errorMessage ? <div className="mt-2 text-xs text-rose-200">{String(h.errorMessage)}</div> : null}
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-sm text-white/60">No emails sent for this invoice yet.</div>
                )}
              </div>
              <div className="border-t border-white/10 bg-black/30 p-4">
                <button type="button" className="ds-btn-secondary h-10 px-3 w-full" onClick={load} disabled={isLoading || isSending}>
                  Refresh history
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="text-xs text-white/55">
        Currency used for the PDF attachment: <span className="text-white/80">{money.currency}</span>
      </div>
    </div>
  );
}

export default EmailComposer;
