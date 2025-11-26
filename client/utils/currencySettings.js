import AsyncStorage from '@react-native-async-storage/async-storage';
import { COMMON_CURRENCIES } from '../services/currency';

const CURRENCY_SETTING_KEY = '@app_currency';
const DEFAULT_CURRENCY = 'USD';

// Get user's preferred currency
export async function getCurrency() {
	try {
		const currency = await AsyncStorage.getItem(CURRENCY_SETTING_KEY);
		return currency || DEFAULT_CURRENCY;
	} catch (err) {
		console.error('Failed to get currency:', err);
		return DEFAULT_CURRENCY;
	}
}

// Set user's preferred currency
export async function setCurrency(currencyCode) {
	try {
		await AsyncStorage.setItem(CURRENCY_SETTING_KEY, currencyCode);
		return true;
	} catch (err) {
		console.error('Failed to set currency:', err);
		return false;
	}
}

// Get currency symbol
export function getCurrencySymbol(currencyCode) {
	const currency = COMMON_CURRENCIES.find(c => c.code === currencyCode);
	return currency?.symbol || currencyCode;
}

// Format amount with currency
export function formatCurrency(amount, currencyCode = null) {
	return new Promise(async (resolve) => {
		const currency = currencyCode || await getCurrency();
		const symbol = getCurrencySymbol(currency);
		const formatted = `${symbol}${parseFloat(amount || 0).toFixed(2)}`;
		resolve(formatted);
	});
}

// Format amount synchronously (requires currency code)
export function formatCurrencySync(amount, currencyCode) {
	const symbol = getCurrencySymbol(currencyCode || 'USD');
	return `${symbol}${parseFloat(amount || 0).toFixed(2)}`;
}

