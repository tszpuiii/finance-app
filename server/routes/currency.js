const express = require('express');
const router = express.Router();
const { getExchangeRates, convertCurrency } = require('../controllers/currencyController');

// Currency routes don't require authentication (public API)
router.get('/rates', getExchangeRates);
router.get('/convert', convertCurrency);

module.exports = router;

