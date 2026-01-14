const express = require('express');
const router = express.Router();
const { getInvoices, setInvoice, updateInvoice, deleteInvoice } = require('../controllers/invoiceController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getInvoices).post(protect, setInvoice);
router.route('/:id').put(protect, updateInvoice).delete(protect, deleteInvoice);

module.exports = router;
