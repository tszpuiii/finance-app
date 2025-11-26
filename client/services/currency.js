import { api } from '../utils/api';

// Get all exchange rates for a base currency
export async function getExchangeRates(baseCurrency = 'USD') {
	try {
		const { data } = await api.get(`/currency/rates?base=${baseCurrency}`);
		return data;
	} catch (err) {
		console.error('Failed to get exchange rates:', err);
		throw err;
	}
}

// Convert currency
export async function convertCurrency(amount, fromCurrency, toCurrency) {
	try {
		const { data } = await api.get(`/currency/convert?amount=${amount}&from=${fromCurrency}&to=${toCurrency}`);
		return data;
	} catch (err) {
		console.error('Failed to convert currency:', err);
		throw err;
	}
}

// Common currencies list
export const COMMON_CURRENCIES = [
	{ code: 'USD', name: 'US Dollar', symbol: '$' },
	{ code: 'EUR', name: 'Euro', symbol: '€' },
	{ code: 'GBP', name: 'British Pound', symbol: '£' },
	{ code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
	{ code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
	{ code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
	{ code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
	{ code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
	{ code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
	{ code: 'KRW', name: 'South Korean Won', symbol: '₩' },
	{ code: 'INR', name: 'Indian Rupee', symbol: '₹' },
	{ code: 'THB', name: 'Thai Baht', symbol: '฿' },
];

