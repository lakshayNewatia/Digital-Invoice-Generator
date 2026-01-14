const PDFDocument = require('pdfkit');
const fs = require('fs');

function formatMoney(amount, currency) {
  const n = Number(amount || 0);
  const code = String(currency || 'INR').toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${code} ${n.toFixed(2)}`;
  }
}

function generateInvoicePDF(doc, invoice, client, items, user, options = {}) {
  const currency = String(options.currency || 'INR').toUpperCase();
  const rate = Number(options.rate || 1);
  const convert = (value) => Number(value || 0) * rate;

  const templateKey = String(invoice?.templateKey || 'classic');
  const theme = (() => {
    switch (templateKey) {
      case 'modern':
        return { accent: '#2563EB', muted: '#6B7280', heading: 20, headerBar: true, headerBarFill: '#2563EB' };
      case 'minimal':
        return { accent: '#111827', muted: '#6B7280', heading: 18, headerBar: false };
      case 'executive':
        return { accent: '#0F172A', muted: '#475569', heading: 20, headerBar: true, headerBarFill: '#0F172A' };
      case 'bold':
        return { accent: '#111827', muted: '#374151', heading: 22, headerBar: true, headerBarFill: '#111827' };
      case 'classic':
      default:
        return { accent: '#111827', muted: '#6B7280', heading: 20, headerBar: false };
    }
  })();

  function setMuted() {
    doc.fillColor(theme.muted);
  }

  function setNormal() {
    doc.fillColor('#000');
  }

  // Header
  if (theme.headerBar) {
    doc.save();
    doc.rect(0, 0, doc.page.width, 74).fill(theme.headerBarFill);
    doc.restore();
    doc.fillColor('#fff');
  }

  if (user.companyLogo) {
    try {
      const logoPath = String(user.companyLogo);
      const looksLikeLocal = !/^https?:\/\//i.test(logoPath);
      if (!looksLikeLocal || fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, theme.headerBar ? 16 : 45, { width: 50 });
      }
    } catch {
      // Ignore missing/invalid logo in production environments.
    }
  }
  doc.fontSize(theme.heading).text(user.companyName || 'Your Company', 110, theme.headerBar ? 20 : 57);

  const sellerLines = [
    user.companyAddress,
    user.companyEmail || user.email,
    user.companyPhone,
    user.companyTaxId ? `Tax ID: ${user.companyTaxId}` : '',
  ].filter(Boolean);
  if (sellerLines.length) {
    doc.fontSize(9);
    if (theme.headerBar) {
      doc.fillColor('rgba(255,255,255,0.85)');
    } else {
      setMuted();
    }
    doc.text(sellerLines.join(' · '), 110, theme.headerBar ? 48 : 80, { width: 240 });
    if (!theme.headerBar) setNormal();
  }

  if (!theme.headerBar) {
    doc.fillColor(theme.accent);
  }
  doc.fontSize(theme.headerBar ? 18 : 20).text('INVOICE', 200, theme.headerBar ? 22 : 50, { align: 'right' });
  if (!theme.headerBar) setNormal();

  doc.fontSize(10).text(`Invoice #: ${invoice.invoiceNumber}`, 200, theme.headerBar ? 48 : 75, { align: 'right' });
  const issue = invoice.issueDate || invoice.date;
  doc.fontSize(10).text(`Date: ${issue ? new Date(issue).toLocaleDateString() : ''}`, 200, theme.headerBar ? 62 : 90, { align: 'right' });
  doc.fontSize(10).text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 200, theme.headerBar ? 76 : 105, { align: 'right' });

  const paymentMeta = [
    invoice.currencyCode ? `Currency: ${String(invoice.currencyCode).toUpperCase()}` : '',
    invoice.paymentTerms ? `Terms: ${invoice.paymentTerms}` : '',
    invoice.paymentMethod ? `Method: ${invoice.paymentMethod}` : '',
  ].filter(Boolean);
  if (paymentMeta.length) {
    doc.fontSize(9);
    if (theme.headerBar) {
      doc.fillColor('rgba(255,255,255,0.85)');
    } else {
      setMuted();
    }
    doc.text(paymentMeta.join(' · '), 200, theme.headerBar ? 90 : 120, { align: 'right' });
    if (!theme.headerBar) setNormal();
  }

  // Bill To
  const billTop = theme.headerBar ? 130 : 150;
  if (templateKey === 'bold') {
    doc.save();
    doc.rect(50, billTop - 6, 512, 18).fill('#111827');
    doc.restore();
    doc.fillColor('#fff').fontSize(10).text('BILL TO', 56, billTop - 3);
    setNormal();
  } else {
    doc.fontSize(12).fillColor(theme.accent).text('Bill To:', 50, billTop);
    setNormal();
  }
  doc.text(client.name, 50, 165);
  doc.text(client.address, 50, 180);
  doc.text(client.email, 50, 195);
  if (client.taxId) {
    doc.fontSize(10).text(`Tax ID: ${client.taxId}`, 50, 210);
  }
  if (client.isTaxExempt) {
    doc.fontSize(10).text('Tax-exempt', 50, client.taxId ? 225 : 210);
  }

  // Invoice Table
  const tableTop = 250;
  const itemCol = 50;
  const qtyCol = 280;
  const rateCol = 370;
  const amountCol = 460;

  if (templateKey === 'executive' || templateKey === 'modern') {
    doc.save();
    doc.rect(50, tableTop - 8, 512, 18).fill(theme.accent);
    doc.restore();
    doc.fillColor('#fff');
  } else if (templateKey === 'minimal') {
    setMuted();
  } else {
    doc.fillColor(theme.accent);
  }
  doc.fontSize(10).text('Description', itemCol, tableTop, { bold: true });
  doc.text('Quantity', qtyCol, tableTop, { bold: true });
  doc.text('Rate', rateCol, tableTop, { bold: true });
  doc.text('Amount', amountCol, tableTop, { bold: true, align: 'right' });
  setNormal();

  let y = tableTop + 25;
  items.forEach(item => {
    doc.text(item.description, itemCol, y);
    doc.text(item.quantity.toString(), qtyCol, y);
    doc.text(formatMoney(convert(item.price), currency), rateCol, y);
    doc.text(formatMoney(convert(item.quantity * item.price), currency), amountCol, y, { align: 'right' });
    if (templateKey === 'modern' || templateKey === 'executive') {
      doc.save();
      doc.strokeColor('#E5E7EB').lineWidth(0.5).moveTo(50, y + 18).lineTo(562, y + 18).stroke();
      doc.restore();
    }
    y += 25;
  });

  // Summary
  const subtotal = invoice.subtotal != null ? invoice.subtotal : invoice.total;
  const discount = Number(invoice.discount || 0);
  const charges = Number(invoice.additionalCharges || 0);
  const taxable = Math.max(0, Number(subtotal || 0) - discount);
  const hasTax = Number(invoice.taxTotal || 0) > 0 || invoice.taxSnapshot;
  const taxName = invoice.taxSnapshot?.tax?.name || invoice.taxSnapshot?.name || 'Tax';
  const taxRate = invoice.taxSnapshot?.tax?.rate;

  let summaryY = y + 20;
  doc.fontSize(10).text(`Subtotal: ${formatMoney(convert(subtotal), currency)}`, 200, summaryY, { align: 'right' });
  summaryY += 15;

  if (discount > 0) {
    doc.fontSize(10).text(`Discount: -${formatMoney(convert(discount), currency)}`, 200, summaryY, { align: 'right' });
    summaryY += 15;
  }

  doc.fontSize(10).text(`Taxable: ${formatMoney(convert(taxable), currency)}`, 200, summaryY, { align: 'right' });
  summaryY += 15;

  if (hasTax) {
    doc
      .fontSize(10)
      .text(
        `${taxName}${typeof taxRate === 'number' ? ` (${taxRate}%)` : ''}: ${formatMoney(convert(invoice.taxTotal), currency)}`,
        200,
        summaryY,
        { align: 'right' },
      );
    summaryY += 15;
  }

  if (charges > 0) {
    doc.fontSize(10).text(`Charges: ${formatMoney(convert(charges), currency)}`, 200, summaryY, { align: 'right' });
    summaryY += 15;
  }

  doc.fontSize(12).text(`Total: ${formatMoney(convert(invoice.total), currency)}`, 200, summaryY + 5, { align: 'right', bold: true });

  if (invoice.status === 'paid' && Number(invoice.paidAmount || 0) > 0) {
    doc.fontSize(10).text(`Paid: ${formatMoney(convert(invoice.paidAmount), currency)}`, 200, summaryY + 25, { align: 'right' });
  }

  // Notes & Terms
  let notesY = doc.page.height - 120;
  if (invoice.notes) {
    doc.fontSize(10).text(`Notes: ${invoice.notes}`, 50, notesY, { width: 500 });
    notesY += 14;
  }
  if (invoice.paymentInstructions) {
    doc.fontSize(10).text(`Payment instructions: ${invoice.paymentInstructions}`, 50, notesY, { width: 500 });
    notesY += 14;
  }
  if (invoice.termsAndConditions) {
    doc.fontSize(10).text(`Terms: ${invoice.termsAndConditions}`, 50, notesY, { width: 500 });
    notesY += 14;
  }

  // Footer
  doc.fontSize(10).text('Thank you for your business.', 50, doc.page.height - 50, { align: 'center' });
}

module.exports = { generateInvoicePDF };
