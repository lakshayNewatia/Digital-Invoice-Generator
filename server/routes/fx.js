const express = require('express');
const router = express.Router();
const { getLatest } = require('../controllers/fxController');

router.get('/latest', getLatest);

module.exports = router;
