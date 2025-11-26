const axios = require('axios');

// Free API: ExchangeRate-API (no API key required for basic usage)
// Alternative: You can use fixer.io, exchangerate-api.com, etc.
const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest';

// Cache exchange rates for 1 hour to reduce API calls
let rateCache = {
	data: null,
	timestamp: null,
	ttl: 60 * 60 * 1000 // 1 hour in milliseconds
};

async function getExchangeRates(req, res) {
	try {
		const { base = 'USD' } = req.query;
		
		// Check cache
		const now = Date.now();
		if (rateCache.data && rateCache.timestamp && (now - rateCache.timestamp) < rateCache.ttl) {
			return res.json({ 
				base,
				rates: rateCache.data.rates,
				cached: true,
				timestamp: rateCache.timestamp
			});
		}
		
		// Fetch from API
		const response = await axios.get(`${EXCHANGE_RATE_API}/${base}`, {
			timeout: 5000
		});
		
		// Update cache
		rateCache = {
			data: response.data,
			timestamp: now
		};
		
		return res.json({
			base: response.data.base,
			rates: response.data.rates,
			cached: false,
			timestamp: now
		});
	} catch (err) {
		console.error('Exchange rate API error:', err.message);
		return res.status(500).json({ 
			error: 'Failed to fetch exchange rates',
			details: err.message 
		});
	}
}

async function convertCurrency(req, res) {
	try {
		const { amount, from, to } = req.query;
		
		if (!amount || !from || !to) {
			return res.status(400).json({ error: 'Missing required parameters: amount, from, to' });
		}
		
		const amountNum = parseFloat(amount);
		if (isNaN(amountNum)) {
			return res.status(400).json({ error: 'Invalid amount' });
		}
		
		// If same currency, return as is
		if (from === to) {
			return res.json({
				amount: amountNum,
				from,
				to,
				rate: 1,
				result: amountNum
			});
		}
		
		// Fetch rates for base currency
		const response = await axios.get(`${EXCHANGE_RATE_API}/${from}`, {
			timeout: 5000
		});
		
		const rate = response.data.rates[to];
		if (!rate) {
			return res.status(400).json({ error: `Currency ${to} not found` });
		}
		
		const result = amountNum * rate;
		
		return res.json({
			amount: amountNum,
			from,
			to,
			rate,
			result: parseFloat(result.toFixed(2))
		});
	} catch (err) {
		console.error('Currency conversion error:', err.message);
		return res.status(500).json({ 
			error: 'Failed to convert currency',
			details: err.message 
		});
	}
}

module.exports = { getExchangeRates, convertCurrency };

