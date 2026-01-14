const PDFDocument = require('pdfkit');
const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const Item = require('../models/Item');
const { generateInvoicePDF: generateCustomInvoicePDF } = require('../utils/pdfGenerator');
const { getLatestRatesInr, getRateFromInr, normalizeCurrencyCode } = require('../utils/fx');

const generateInvoicePDF = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('client').populate('items');
    if (!invoice) {
      return res.status(404).send('Invoice not found');
    }

    // Authorization check
    if (invoice.user.toString() !== req.user.id) {
      return res.status(401).send('User not authorized');
    }

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);

    doc.pipe(res);

    const currency = normalizeCurrencyCode(req.query.currency || 'INR');
    let rate = 1;
    if (currency !== 'INR') {
      const cached = await getLatestRatesInr();
      rate = getRateFromInr(cached.rates, currency);
    }

    generateCustomInvoicePDF(doc, invoice, invoice.client, invoice.items, req.user, { currency, rate });

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};

module.exports = { generateInvoicePDF };
