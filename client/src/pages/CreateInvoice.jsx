import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { apiListClients } from '@/lib/clientsApi';
import { apiListItems } from '@/lib/itemsApi';
import { apiCreateInvoice } from '@/lib/invoicesApi';
import { apiListInvoices } from '@/lib/invoicesApi';
import { useAuth } from '@/state/auth.jsx';
import { useMoney } from '@/lib/money.js';
import {
  computeDueDateFromTerms,
  getLastClientId,
  getLastInvoiceNumber,
  getLastPaymentTermsDays,
  setLastClientId,
  setLastInvoiceNumber,
  setLastPaymentTermsDays,
  suggestNextInvoiceNumber,
} from '@/lib/smartDefaults.js';

function CreateInvoice() {
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const money = useMoney();

  const todayIso = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [clients, setClients] = useState([]);
  const [items, setItems] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState(todayIso);
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('pending');
  const [paymentTermsDays, setPaymentTermsDays] = useState(getLastPaymentTermsDays());

  const [paymentTerms, setPaymentTerms] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paidAmount, setPaidAmount] = useState(0);

  const [discount, setDiscount] = useState(0);
  const [additionalCharges, setAdditionalCharges] = useState(0);

  const [notes, setNotes] = useState('');
  const [paymentInstructions, setPaymentInstructions] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');

  const [applyTax, setApplyTax] = useState(false);
  const [taxName, setTaxName] = useState('GST');
  const [taxRate, setTaxRate] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError('');

    Promise.all([apiListClients(token), apiListItems(token), apiListInvoices(token)])
      .then(([cli, it, inv]) => {
        if (cancelled) return;
        setClients(Array.isArray(cli) ? cli : []);
        setItems(Array.isArray(it) ? it : []);
        setInvoices(Array.isArray(inv) ? inv : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'Failed to load invoice dependencies');
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    // Smart defaults (silent): preselect last used client if it still exists.
    if (selectedClientId) return;
    if (!clients.length) return;
    const last = getLastClientId();
    if (last && clients.some((c) => String(c._id) === String(last))) {
      setSelectedClientId(String(last));
    }
  }, [clients, selectedClientId]);

  useEffect(() => {
    // Smart defaults: invoice number suggestion (pattern-aware).
    if (invoiceNumber.trim()) return;
    const seed = getLastInvoiceNumber();
    const suggestion = suggestNextInvoiceNumber(invoices, { seed, fallbackPrefix: 'INV-', fallbackStart: 1001 });
    setInvoiceNumber(suggestion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices]);

  useEffect(() => {
    if (!user?.invoiceDefaults) return;
    const name = user.invoiceDefaults.defaultTaxName;
    const rate = user.invoiceDefaults.defaultTaxRate;
    if (name != null) setTaxName(String(name || 'GST'));
    if (rate != null) setTaxRate(Number(rate || 0));
    const terms = user.invoiceDefaults.paymentTermsDays;
    if (terms != null && !getLastPaymentTermsDays()) {
      setPaymentTermsDays(Number(terms || 0));
    }
  }, [user]);

  useEffect(() => {
    // Smart defaults: compute due date from payment terms unless user already picked one.
    if (dueDate) return;
    const suggested = computeDueDateFromTerms(paymentTermsDays);
    if (suggested) setDueDate(suggested);
  }, [paymentTermsDays, dueDate]);

  useEffect(() => {
    if (paymentTerms) return;
    const n = Number(paymentTermsDays || 0);
    if (!Number.isFinite(n) || n <= 0) return;
    setPaymentTerms(`Net ${n}`);
  }, [paymentTerms, paymentTermsDays]);

  const selectedItems = useMemo(() => {
    const byId = new Map(items.map((i) => [String(i._id), i]));
    return selectedItemIds.map((id) => byId.get(String(id))).filter(Boolean);
  }, [items, selectedItemIds]);

  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return clients.find((c) => String(c._id) === String(selectedClientId)) || null;
  }, [clients, selectedClientId]);

  useEffect(() => {
    if (!selectedClient) return;
    if (selectedClient.isTaxExempt) {
      setApplyTax(false);
    }
  }, [selectedClient]);

  const computedTotal = useMemo(() => {
    return selectedItems.reduce((sum, it) => {
      const qty = Number(it.quantity || 0);
      const price = Number(it.price || 0);
      return sum + qty * price;
    }, 0);
  }, [selectedItems]);

  const computedSubtotal = computedTotal;

  const computedTaxableAmount = useMemo(() => {
    return Math.max(0, Number(computedSubtotal || 0) - Number(discount || 0));
  }, [computedSubtotal, discount]);

  const computedTaxTotal = useMemo(() => {
    if (!applyTax) return 0;
    const r = Number(taxRate || 0);
    if (!Number.isFinite(r) || r <= 0) return 0;
    return (computedTaxableAmount * r) / 100;
  }, [applyTax, taxRate, computedTaxableAmount]);

  const computedGrandTotal = useMemo(() => {
    return Math.max(0, computedTaxableAmount + computedTaxTotal + Number(additionalCharges || 0));
  }, [computedTaxableAmount, computedTaxTotal, additionalCharges]);

  const onToggleItem = (id) => {
    setSelectedItemIds((prev) => {
      const key = String(id);
      if (prev.includes(key)) return prev.filter((x) => x !== key);
      return [...prev, key];
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedClientId) {
      setError('Please select a client');
      return;
    }

    if (!invoiceNumber.trim()) {
      setError('Please enter an invoice number');
      return;
    }

    if (!dueDate) {
      setError('Please choose a due date');
      return;
    }

    if (!selectedItemIds.length) {
      setError('Please select at least one item');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        client: selectedClientId,
        items: selectedItemIds,
        invoiceNumber: invoiceNumber.trim(),
        issueDate,
        dueDate,
        currencyCode: money.currency,
        paymentTerms: paymentTerms.trim(),
        paymentMethod: paymentMethod.trim(),
        paidAmount: Number(paidAmount || 0),
        subtotal: computedSubtotal,
        discount: Number(discount || 0),
        additionalCharges: Number(additionalCharges || 0),
        taxTotal: computedTaxTotal,
        taxSnapshot: applyTax
          ? {
              mode: 'invoice',
              exclusive: true,
              tax: {
                name: String(taxName || 'GST').trim() || 'GST',
                rate: Number(taxRate || 0),
              },
            }
          : null,
        notes,
        paymentInstructions,
        termsAndConditions,
        total: computedGrandTotal,
        status,
      };
      const created = await apiCreateInvoice(token, payload);
      setLastClientId(selectedClientId);
      setLastPaymentTermsDays(paymentTermsDays);
      setLastInvoiceNumber(invoiceNumber.trim());
      const normalized = String(payload.status || '').toLowerCase();
      if (normalized === 'pending' || normalized === 'draft' || !normalized) {
        navigate(`/invoices/${created._id}/template`);
      } else {
        navigate(`/invoices/${created._id}`);
      }
    } catch (err) {
      setError(err?.message || 'Failed to create invoice');
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
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_30%_0%,rgba(34,211,238,0.18),rgba(7,10,18,0))]" />
        <div className="relative space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Invoice studio</div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">Create Invoice</h1>
          <p className="max-w-2xl text-sm text-white/65">
            Choose a client, pick line items, and ship a clean invoice in one pass.
          </p>
        </div>
      </motion.div>

      {error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-6 py-4 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={reduceMotion ? undefined : { duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
          className="ds-panel lg:col-span-3"
        >
          <div className="border-b border-white/10 bg-white/5 p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Details</div>
            <div className="mt-2 font-display text-2xl font-semibold tracking-tight">Invoice setup</div>
            <div className="mt-1 text-sm text-white/60">Fields match backend requirements.</div>
          </div>

          <form onSubmit={onSubmit} className="space-y-5 p-6">
            {!isLoading && !clients.length ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm font-semibold text-white/85">No clients yet</div>
                <div className="mt-1 text-sm text-white/60">Invoices need a recipient. Create a client first.</div>
                <div className="mt-4">
                  <Link to="/clients" className="ds-btn-primary h-10 px-3 inline-flex items-center">
                    Add a client
                  </Link>
                </div>
              </div>
            ) : null}

            {!isLoading && !items.length ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm font-semibold text-white/85">No items in your catalog</div>
                <div className="mt-1 text-sm text-white/60">Create at least one item so your invoice can calculate totals.</div>
                <div className="mt-4">
                  <Link to="/settings" className="ds-btn-primary h-10 px-3 inline-flex items-center">
                    Create an item
                  </Link>
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/85" htmlFor="invoiceNumber">
                  Invoice #
                </label>
                <input
                  id="invoiceNumber"
                  className="ds-input"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="INV-1042"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/85" htmlFor="issueDate">
                  Issue date
                </label>
                <input
                  id="issueDate"
                  className="ds-input"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/85" htmlFor="dueDate">
                  Due date
                </label>
                <input
                  id="dueDate"
                  className="ds-input"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/85" htmlFor="paymentTerms">
                  Payment terms label
                </label>
                <input
                  id="paymentTerms"
                  className="ds-input"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="Net 15"
                />
                <div className="text-xs text-white/55">Shown on the PDF (e.g., Net 15 / Net 30).</div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/85" htmlFor="paymentMethod">
                  Payment method (optional)
                </label>
                <input
                  id="paymentMethod"
                  className="ds-input"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  placeholder="UPI / Bank transfer"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/85" htmlFor="paymentTermsDays">
                  Payment terms (days)
                </label>
                <input
                  id="paymentTermsDays"
                  className="ds-input"
                  type="number"
                  min="0"
                  value={paymentTermsDays}
                  onChange={(e) => setPaymentTermsDays(e.target.value)}
                />
                <div className="text-xs text-white/55">Used to auto-suggest a due date. You can still override it.</div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/85" htmlFor="discount">
                  Discount (optional)
                </label>
                <input
                  id="discount"
                  className="ds-input"
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/85" htmlFor="additionalCharges">
                  Additional charges / shipping (optional)
                </label>
                <input
                  id="additionalCharges"
                  className="ds-input"
                  type="number"
                  min="0"
                  value={additionalCharges}
                  onChange={(e) => setAdditionalCharges(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/85" htmlFor="client">
                  Client
                </label>
                <select
                  id="client"
                  className="ds-input"
                  value={selectedClientId}
                  onChange={(e) => {
                    const next = e.target.value;
                    setSelectedClientId(next);
                    if (next) setLastClientId(next);
                  }}
                  disabled={isLoading}
                  required
                >
                  <option value="">Select client…</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} — {c.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/85" htmlFor="status">
                  Status
                </label>
                <select
                  id="status"
                  className="ds-input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="pending">draft</option>
                  <option value="sent">sent</option>
                  <option value="paid">paid</option>
                </select>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-white/85">Tax</div>
                  <div className="mt-1 text-xs text-white/55">Invoice-level tax applied on subtotal (exclusive).</div>
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-white/75">
                  <input type="checkbox" className="h-4 w-4 accent-emerald-400" checked={applyTax} onChange={(e) => setApplyTax(e.target.checked)} />
                  Apply tax
                </label>
              </div>

              {applyTax ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white/85" htmlFor="taxName">Tax name</label>
                    <input id="taxName" className="ds-input" value={taxName} onChange={(e) => setTaxName(e.target.value)} placeholder="GST" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white/85" htmlFor="taxRate">Tax rate (%)</label>
                    <input id="taxRate" className="ds-input" type="number" min="0" max="100" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
                  </div>
                </div>
              ) : null}

              <div className="grid gap-2">
                <div className="flex items-center justify-between text-sm text-white/70">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{money.formatFromInr(computedSubtotal)}</span>
                </div>
                {Number(discount || 0) > 0 ? (
                  <div className="flex items-center justify-between text-sm text-white/70">
                    <span>Discount</span>
                    <span className="tabular-nums">-{money.formatFromInr(Number(discount || 0))}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between text-sm text-white/70">
                  <span>Taxable amount</span>
                  <span className="tabular-nums">{money.formatFromInr(computedTaxableAmount)}</span>
                </div>
                {applyTax ? (
                  <div className="flex items-center justify-between text-sm text-white/70">
                    <span>
                      {String(taxName || 'Tax').trim() || 'Tax'} ({Number(taxRate || 0) || 0}%)
                    </span>
                    <span className="tabular-nums">{money.formatFromInr(computedTaxTotal)}</span>
                  </div>
                ) : null}
                {Number(additionalCharges || 0) > 0 ? (
                  <div className="flex items-center justify-between text-sm text-white/70">
                    <span>Additional charges</span>
                    <span className="tabular-nums">{money.formatFromInr(Number(additionalCharges || 0))}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between text-sm font-semibold text-white/85">
                  <span>Total</span>
                  <span className="tabular-nums">{money.formatFromInr(computedGrandTotal)}</span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/85" htmlFor="paidAmount">
                  Paid amount (if paid)
                </label>
                <input
                  id="paidAmount"
                  className="ds-input"
                  type="number"
                  min="0"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/85" htmlFor="notes">Invoice notes (optional)</label>
                <textarea id="notes" className="ds-input min-h-[96px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/85" htmlFor="paymentInstructions">Payment instructions</label>
                <textarea
                  id="paymentInstructions"
                  className="ds-input min-h-[96px]"
                  value={paymentInstructions}
                  onChange={(e) => setPaymentInstructions(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/85" htmlFor="termsAndConditions">Terms and conditions (optional)</label>
                <textarea
                  id="termsAndConditions"
                  className="ds-input min-h-[96px]"
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-white/85">Line items</div>
                  <div className="text-xs text-white/55">Select existing items from the backend catalog.</div>
                </div>
                <div className="text-sm font-semibold tabular-nums text-white/85">{money.formatFromInr(computedTotal)}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/30">
                <div className="max-h-[340px] overflow-auto divide-y divide-white/10">
                  {isLoading ? (
                    <div className="p-5 text-sm text-white/60">Loading items…</div>
                  ) : items.length ? (
                    items.map((it) => {
                      const id = String(it._id);
                      const checked = selectedItemIds.includes(id);
                      const lineTotal = Number(it.quantity || 0) * Number(it.price || 0);
                      return (
                        <label
                          key={id}
                          className="flex cursor-pointer items-start gap-3 p-5 hover:bg-white/5"
                        >
                          <input
                            className="mt-1 h-4 w-4 accent-emerald-400"
                            type="checkbox"
                            checked={checked}
                            onChange={() => onToggleItem(id)}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-white/85">{it.description}</div>
                            <div className="mt-1 text-xs text-white/55">
                              Qty <span className="tabular-nums">{it.quantity}</span> · Price{' '}
                              <span className="tabular-nums">{money.formatFromInr(it.price)}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold tabular-nums text-white/85">{money.formatFromInr(lineTotal)}</div>
                            <div className="text-xs text-white/55">line</div>
                          </div>
                        </label>
                      );
                    })
                  ) : (
                    <div className="p-5 text-sm text-white/60">
                      No items found. Add items from the backend or seed the database.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button className="ds-btn-primary w-full" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving draft…' : 'Next page'}
            </button>
          </form>
        </motion.div>

        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={reduceMotion ? undefined : { duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
          className="ds-panel lg:col-span-2"
        >
          <div className="border-b border-white/10 bg-white/5 p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Summary</div>
            <div className="mt-2 font-display text-2xl font-semibold tracking-tight">Review</div>
            <div className="mt-1 text-sm text-white/60">A clean, quick sanity check.</div>
          </div>

          <div className="space-y-4 p-6">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Client</div>
              <div className="mt-2 text-sm font-semibold text-white/85">
                {selectedClientId ? clients.find((c) => c._id === selectedClientId)?.name || 'Selected' : '—'}
              </div>
              <div className="mt-1 text-xs text-white/55">
                {selectedClientId ? clients.find((c) => c._id === selectedClientId)?.email || '' : 'Select a client'}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Total</div>
              <div className="mt-2 font-display text-3xl font-semibold tracking-tight tabular-nums">
                {money.formatFromInr(computedTotal)}
              </div>
              <div className="mt-1 text-xs text-white/55">Computed from selected items (qty × price)</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Due</div>
              <div className="mt-2 text-sm font-semibold text-white/85">{dueDate || '—'}</div>
              <div className="mt-1 text-xs text-white/55">Backend expects an ISO date</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Selected items</div>
              <div className="mt-2 text-sm font-semibold text-white/85 tabular-nums">{selectedItemIds.length}</div>
              <div className="mt-1 text-xs text-white/55">Choose at least one</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default CreateInvoice;
