const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  address: {
    type: String,
  },
  phone: {
    type: String,
  },

  taxId: {
    type: String,
    default: '',
  },
  isTaxExempt: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model('client', ClientSchema);
