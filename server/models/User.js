const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  companyName: {
    type: String,
    default: '',
  },
  companyLogo: {
    type: String,
    default: '',
  },

  companyAddress: {
    type: String,
    default: '',
  },
  companyEmail: {
    type: String,
    default: '',
  },
  companyPhone: {
    type: String,
    default: '',
  },
  companyTaxId: {
    type: String,
    default: '',
  },

  invoiceDefaults: {
    defaultTaxName: {
      type: String,
      default: 'GST',
    },
    defaultTaxRate: {
      type: Number,
      default: 0,
    },
    taxMode: {
      type: String,
      default: 'invoice',
    },
    paymentTermsDays: {
      type: Number,
      default: 0,
    },
  },
});

module.exports = mongoose.model('user', UserSchema);
