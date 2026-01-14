const mongoose = require('mongoose');

const InvoiceHistoryEntrySchema = new mongoose.Schema(
  {
    version: {
      type: Number,
      required: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
    },
    summary: {
      type: String,
      default: '',
    },
    diff: {
      type: Object,
      default: {},
    },
  },
  { _id: false }
);

const InvoiceSchema = new mongoose.Schema(
  {
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
    index: true,
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'client',
  },
  items: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'item',
    },
  ],
  invoiceNumber: {
    type: String,
    required: true,
  },
  issueDate: {
    type: Date,
    default: Date.now,
  },
  dueDate: {
    type: Date,
    required: true,
  },

  currencyCode: {
    type: String,
    default: 'INR',
  },
  paymentTerms: {
    type: String,
    default: '',
  },
  paymentMethod: {
    type: String,
    default: '',
  },
  paidAmount: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    required: true,
  },

  subtotal: {
    type: Number,
    default: 0,
  },
  discount: {
    type: Number,
    default: 0,
  },
  additionalCharges: {
    type: Number,
    default: 0,
  },
  taxTotal: {
    type: Number,
    default: 0,
  },
  taxSnapshot: {
    type: Object,
    default: null,
  },

  notes: {
    type: String,
    default: '',
  },
  paymentInstructions: {
    type: String,
    default: '',
  },
  termsAndConditions: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    default: 'pending',
  },
  date: {
    type: Date,
    default: Date.now,
  },

  sentAt: {
    type: Date,
    default: null,
  },
  paidAt: {
    type: Date,
    default: null,
  },

  locked: {
    type: Boolean,
    default: false,
  },

  templateKey: {
    type: String,
    default: 'classic',
  },

  version: {
    type: Number,
    default: 1,
  },
  history: {
    type: [InvoiceHistoryEntrySchema],
    default: [],
  },
  },
  { timestamps: true }
);

module.exports = mongoose.model('invoice', InvoiceSchema);
