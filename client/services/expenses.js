import { api } from '../utils/api';

export async function fetchExpenses() {
	const { data } = await api.get('/expenses');
	return data.expenses || [];
}

export async function createExpense(payload) {
	const { data } = await api.post('/expenses', payload);
	return data;
}

export async function updateExpense(id, payload) {
	// If image is included, send base64 directly
	const { data } = await api.put(`/expenses/${id}`, payload);
	return data;
}

export async function deleteExpense(id) {
	const { data } = await api.delete(`/expenses/${id}`);
	return data;
}

export async function convertAllExpenses(fromCurrency, toCurrency, exchangeRate) {
	const { data } = await api.post('/expenses/convert', {
		fromCurrency,
		toCurrency,
		exchangeRate
	});
	return data;
}


