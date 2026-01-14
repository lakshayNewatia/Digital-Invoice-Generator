const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const Item = require('../models/Item');

function normalizeStatus(s) {
  const v = String(s || '').toLowerCase();
  if (!v) return 'pending';
  return v;
}

function isDraftLike(status) {
  const s = normalizeStatus(status);
  return s === 'draft' || s === 'pending';
}

function isSentLike(status) {
  const s = normalizeStatus(status);
  return s === 'sent';
}

function isPaid(status) {
  const s = normalizeStatus(status);
  return s === 'paid';
}

function clampRate(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  if (n < 0 || n > 100) return null;
  return n;
}

function clampMoney(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  if (n < 0) return null;
  return n;
}

function normalizeCurrency(code) {
  const c = String(code || '').trim().toUpperCase();
  return c || 'INR';
}

function toIsoDateOnly(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function arrayEq(a, b) {
  const aa = Array.isArray(a) ? a.map(String) : [];
  const bb = Array.isArray(b) ? b.map(String) : [];
  if (aa.length !== bb.length) return false;
  for (let i = 0; i < aa.length; i++) {
    if (aa[i] !== bb[i]) return false;
  }
  return true;
}

async function requireOwnedClient(userId, clientId) {
  const client = await Client.findOne({ _id: clientId, user: userId }).select('_id').lean();
  if (!client) {
    const err = new Error('Client not found');
    err.statusCode = 400;
    throw err;
  }
}

async function requireOwnedItems(userId, itemIds) {
  const ids = Array.isArray(itemIds) ? itemIds : [];
  const unique = [...new Set(ids.map(String))];
  if (!unique.length) {
    const err = new Error('At least one item is required');
    err.statusCode = 400;
    throw err;
  }

  const count = await Item.countDocuments({ _id: { $in: unique }, user: userId });
  if (count !== unique.length) {
    const err = new Error('One or more items are invalid');
    err.statusCode = 400;
    throw err;
  }
}

// @desc    Get invoices
// @route   GET /api/invoices
// @access  Private
const getInvoices = async (req, res) => {
  const invoices = await Invoice.find({ user: req.user.id });
  res.status(200).json(invoices);
};

// @desc    Set invoice
// @route   POST /api/invoices
// @access  Private
const setInvoice = async (req, res) => {
  const {
    client,
    items,
    invoiceNumber,
    dueDate,
    total,
    status,
    subtotal,
    taxTotal,
    taxSnapshot,
    issueDate,
    currencyCode,
    paymentTerms,
    paymentMethod,
    discount,
    additionalCharges,
    notes,
    paymentInstructions,
    termsAndConditions,
    paidAmount,
    templateKey,
  } = req.body;

  if (!client || !items || !invoiceNumber || !dueDate || total == null) {
    res.status(400);
    throw new Error('Please add all fields');
  }

  await requireOwnedClient(req.user.id, client);
  await requireOwnedItems(req.user.id, items);

  const cleanSubtotal = subtotal == null ? null : Number(subtotal);
  const cleanTaxTotal = taxTotal == null ? null : Number(taxTotal);
  const cleanDiscount = discount == null ? 0 : Number(discount);
  const cleanAdditional = additionalCharges == null ? 0 : Number(additionalCharges);

  const discountOk = cleanDiscount == null || (!Number.isNaN(cleanDiscount) && cleanDiscount >= 0);
  const chargesOk = cleanAdditional == null || (!Number.isNaN(cleanAdditional) && cleanAdditional >= 0);
  if (!discountOk || !chargesOk) {
    res.status(400);
    throw new Error('Invalid discount or additional charges');
  }

  let cleanTotal = Number(total);
  if (
    cleanSubtotal != null &&
    !Number.isNaN(cleanSubtotal) &&
    cleanTaxTotal != null &&
    !Number.isNaN(cleanTaxTotal)
  ) {
    // Total is derived: (subtotal - discount) + tax + additional charges
    cleanTotal = Math.max(0, cleanSubtotal - Number(cleanDiscount || 0) + Number(cleanTaxTotal || 0) + Number(cleanAdditional || 0));
  }

  let cleanTaxSnapshot = taxSnapshot || null;
  if (cleanTaxSnapshot && typeof cleanTaxSnapshot === 'object') {
    const name = cleanTaxSnapshot?.tax?.name ?? cleanTaxSnapshot?.name;
    const rate = cleanTaxSnapshot?.tax?.rate ?? cleanTaxSnapshot?.rate;
    if (name != null) {
      const s = String(name).trim();
      if (cleanTaxSnapshot.tax && typeof cleanTaxSnapshot.tax === 'object') {
        cleanTaxSnapshot.tax.name = s;
      } else {
        cleanTaxSnapshot.name = s;
      }
    }
    if (rate != null) {
      const r = clampRate(rate);
      if (r == null) {
        res.status(400);
        throw new Error('Invalid tax rate');
      }
      if (cleanTaxSnapshot.tax && typeof cleanTaxSnapshot.tax === 'object') {
        cleanTaxSnapshot.tax.rate = r;
      } else {
        cleanTaxSnapshot.rate = r;
      }
    }
  }

  const normalizedStatus = normalizeStatus(status);

  const cleanPaidAmount = paidAmount == null ? null : clampMoney(paidAmount);
  if (paidAmount != null && cleanPaidAmount == null) {
    res.status(400);
    throw new Error('Invalid paid amount');
  }

  const invoice = await Invoice.create({
    user: req.user.id,
    client,
    items,
    invoiceNumber,
    issueDate: issueDate ? new Date(issueDate) : undefined,
    dueDate,
    currencyCode: normalizeCurrency(currencyCode),
    paymentTerms: paymentTerms != null ? String(paymentTerms || '') : '',
    paymentMethod: paymentMethod != null ? String(paymentMethod || '') : '',
    paidAmount: cleanPaidAmount != null ? cleanPaidAmount : 0,
    total: cleanTotal,
    subtotal: cleanSubtotal != null && !Number.isNaN(cleanSubtotal) ? cleanSubtotal : 0,
    discount: Number(cleanDiscount || 0),
    additionalCharges: Number(cleanAdditional || 0),
    taxTotal: cleanTaxTotal != null && !Number.isNaN(cleanTaxTotal) ? cleanTaxTotal : 0,
    taxSnapshot: cleanTaxSnapshot,
    notes: notes != null ? String(notes || '') : '',
    paymentInstructions: paymentInstructions != null ? String(paymentInstructions || '') : '',
    termsAndConditions: termsAndConditions != null ? String(termsAndConditions || '') : '',
    status,
    sentAt: normalizedStatus === 'sent' ? new Date() : null,
    paidAt: normalizedStatus === 'paid' ? new Date() : null,
    locked: normalizedStatus === 'sent' || normalizedStatus === 'paid',
    templateKey: templateKey != null ? String(templateKey || 'classic') : 'classic',
  });

  res.status(201).json(invoice);
};

// @desc    Update invoice
// @route   PUT /api/invoices/:id
// @access  Private
const updateInvoice = async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    res.status(400);
    throw new Error('Invoice not found');
  }

  // Check for user
  if (!req.user) {
    res.status(401);
    throw new Error('User not found');
  }

  // Make sure the logged in user matches the invoice user
  if (invoice.user.toString() !== req.user.id) {
    res.status(401);
    throw new Error('User not authorized');
  }

  const draftLike = isDraftLike(invoice.status);
  const sentLike = isSentLike(invoice.status);
  const paid = isPaid(invoice.status);

  if (paid) {
    res.status(400);
    throw new Error('Paid invoices are locked');
  }

  if (invoice.locked && !draftLike) {
    res.status(400);
    throw new Error('Invoice is locked');
  }

  const next = {
    client: req.body.client ?? invoice.client,
    items: req.body.items ?? invoice.items,
    invoiceNumber: req.body.invoiceNumber ?? invoice.invoiceNumber,
    issueDate: req.body.issueDate ?? invoice.issueDate,
    dueDate: req.body.dueDate ?? invoice.dueDate,
    currencyCode: req.body.currencyCode ?? invoice.currencyCode,
    paymentTerms: req.body.paymentTerms ?? invoice.paymentTerms,
    paymentMethod: req.body.paymentMethod ?? invoice.paymentMethod,
    paidAmount: req.body.paidAmount ?? invoice.paidAmount,
    total: req.body.total ?? invoice.total,
    subtotal: req.body.subtotal ?? invoice.subtotal,
    discount: req.body.discount ?? invoice.discount,
    additionalCharges: req.body.additionalCharges ?? invoice.additionalCharges,
    taxTotal: req.body.taxTotal ?? invoice.taxTotal,
    taxSnapshot: req.body.taxSnapshot ?? invoice.taxSnapshot,
    notes: req.body.notes ?? invoice.notes,
    paymentInstructions: req.body.paymentInstructions ?? invoice.paymentInstructions,
    termsAndConditions: req.body.termsAndConditions ?? invoice.termsAndConditions,
    templateKey: req.body.templateKey ?? invoice.templateKey,
    status: req.body.status ?? invoice.status,
  };

  if (String(next.client) !== String(invoice.client)) {
    await requireOwnedClient(req.user.id, next.client);
  }
  if (!arrayEq(next.items, invoice.items)) {
    await requireOwnedItems(req.user.id, next.items);
  }

  const nextStatus = normalizeStatus(next.status);
  if (sentLike) {
    // Sent invoices: tax values locked (and therefore totals locked).
    const taxChanged = JSON.stringify(next.taxSnapshot || null) !== JSON.stringify(invoice.taxSnapshot || null);
    if (
      taxChanged ||
      Number(next.subtotal) !== Number(invoice.subtotal) ||
      Number(next.discount) !== Number(invoice.discount) ||
      Number(next.additionalCharges) !== Number(invoice.additionalCharges) ||
      Number(next.taxTotal) !== Number(invoice.taxTotal) ||
      Number(next.total) !== Number(invoice.total)
    ) {
      res.status(400);
      throw new Error('Sent invoices are tax-locked');
    }
  }

  const diff = {};
  const changes = [];

  if (String(next.invoiceNumber || '') !== String(invoice.invoiceNumber || '')) {
    diff.invoiceNumber = { from: invoice.invoiceNumber, to: next.invoiceNumber };
    changes.push('Invoice #');
  }

  if (toIsoDateOnly(next.dueDate) !== toIsoDateOnly(invoice.dueDate)) {
    diff.dueDate = { from: invoice.dueDate, to: next.dueDate };
    changes.push('Due date');
  }

  if (toIsoDateOnly(next.issueDate) !== toIsoDateOnly(invoice.issueDate)) {
    diff.issueDate = { from: invoice.issueDate, to: next.issueDate };
    changes.push('Issue date');
  }

  if (Number(next.total) !== Number(invoice.total)) {
    diff.total = { from: invoice.total, to: next.total };
    changes.push('Total');
  }

  if (Number(next.subtotal) !== Number(invoice.subtotal)) {
    diff.subtotal = { from: invoice.subtotal, to: next.subtotal };
    changes.push('Subtotal');
  }

  if (Number(next.discount) !== Number(invoice.discount)) {
    diff.discount = { from: invoice.discount, to: next.discount };
    changes.push('Discount');
  }

  if (Number(next.additionalCharges) !== Number(invoice.additionalCharges)) {
    diff.additionalCharges = { from: invoice.additionalCharges, to: next.additionalCharges };
    changes.push('Additional charges');
  }

  if (Number(next.taxTotal) !== Number(invoice.taxTotal)) {
    diff.taxTotal = { from: invoice.taxTotal, to: next.taxTotal };
    changes.push('Tax');
  }

  if (String(next.client || '') !== String(invoice.client || '')) {
    diff.client = { from: invoice.client, to: next.client };
    changes.push('Client');
  }

  if (!arrayEq(next.items, invoice.items)) {
    diff.items = { fromCount: Array.isArray(invoice.items) ? invoice.items.length : 0, toCount: Array.isArray(next.items) ? next.items.length : 0 };
    changes.push('Items');
  }

  if (normalizeStatus(next.status) !== normalizeStatus(invoice.status)) {
    diff.status = { from: invoice.status, to: next.status };
    changes.push('Status');
  }

  // Apply update
  invoice.client = next.client;
  invoice.items = next.items;
  invoice.invoiceNumber = next.invoiceNumber;
  invoice.issueDate = next.issueDate ? new Date(next.issueDate) : invoice.issueDate;
  invoice.dueDate = next.dueDate;
  invoice.currencyCode = normalizeCurrency(next.currencyCode);
  invoice.paymentTerms = next.paymentTerms != null ? String(next.paymentTerms || '') : '';
  invoice.paymentMethod = next.paymentMethod != null ? String(next.paymentMethod || '') : '';
  invoice.paidAmount = clampMoney(next.paidAmount) ?? Number(invoice.paidAmount || 0);
  invoice.subtotal = Number(next.subtotal || 0);
  invoice.discount = Number(next.discount || 0);
  invoice.additionalCharges = Number(next.additionalCharges || 0);
  invoice.taxTotal = Number(next.taxTotal || 0);
  invoice.taxSnapshot = next.taxSnapshot || null;
  invoice.total = Number(next.total || 0);
  invoice.notes = next.notes != null ? String(next.notes || '') : '';
  invoice.paymentInstructions = next.paymentInstructions != null ? String(next.paymentInstructions || '') : '';
  invoice.termsAndConditions = next.termsAndConditions != null ? String(next.termsAndConditions || '') : '';
  invoice.templateKey = next.templateKey != null ? String(next.templateKey || 'classic') : invoice.templateKey;

  const prevStatus = normalizeStatus(invoice.status);
  invoice.status = next.status;

  if (prevStatus !== nextStatus && nextStatus === 'sent' && !invoice.sentAt) {
    invoice.sentAt = new Date();
  }
  if (prevStatus !== nextStatus && nextStatus === 'paid' && !invoice.paidAt) {
    invoice.paidAt = new Date();
  }

  if (nextStatus === 'sent' || nextStatus === 'paid') {
    invoice.locked = true;
  }

  if (draftLike && changes.length) {
    invoice.version = Number(invoice.version || 1) + 1;
    invoice.history = Array.isArray(invoice.history) ? invoice.history : [];
    invoice.history.push({
      version: invoice.version,
      changedAt: new Date(),
      changedBy: req.user.id,
      summary: `Updated: ${changes.join(', ')}`,
      diff,
    });
  }

  const saved = await invoice.save();
  res.status(200).json(saved);
};

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private
const deleteInvoice = async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    res.status(400);
    throw new Error('Invoice not found');
  }

  // Check for user
  if (!req.user) {
    res.status(401);
    throw new Error('User not found');
  }

  // Make sure the logged in user matches the invoice user
  if (invoice.user.toString() !== req.user.id) {
    res.status(401);
    throw new Error('User not authorized');
  }

  await Invoice.findByIdAndDelete(req.params.id);

  res.status(200).json({ id: req.params.id });
};

module.exports = {
  getInvoices,
  setInvoice,
  updateInvoice,
  deleteInvoice,
};
