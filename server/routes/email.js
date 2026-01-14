const express = require('express');
const router = express.Router();
const {
  sendInvoiceEmail,
  getInvoiceEmailDraft,
  sendInvoiceEmailCustom,
  listInvoiceEmailHistory,
  listEmailHistory,
} = require('../controllers/emailController');
const { protect } = require('../middleware/authMiddleware');

router.get('/history', protect, listEmailHistory);
router.get('/:id/history', protect, listInvoiceEmailHistory);
router.get('/:id/draft', protect, getInvoiceEmailDraft);
router.post('/:id/send-custom', protect, sendInvoiceEmailCustom);
router.post('/:id/send', protect, sendInvoiceEmail);

module.exports = router;
