const mongoose = require('mongoose');

const EmailLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },

    from: { type: String, default: '' },
    to: [{ type: String }],
    cc: [{ type: String }],
    bcc: [{ type: String }],

    subject: { type: String, default: '' },
    bodyText: { type: String, default: '' },

    currency: { type: String, default: 'INR' },

    status: { type: String, enum: ['sent', 'failed'], required: true },
    providerMessageId: { type: String, default: '' },
    accepted: [{ type: String }],
    rejected: [{ type: String }],
    providerResponse: { type: String, default: '' },
    errorMessage: { type: String, default: '' },

    sentAt: { type: Date },
  },
  { timestamps: true },
);

module.exports = mongoose.model('EmailLog', EmailLogSchema);
