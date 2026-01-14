const express = require('express');
const router = express.Router();
const { generateInvoicePDF } = require('../controllers/pdfController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:id/generate', protect, generateInvoicePDF);

module.exports = router;
