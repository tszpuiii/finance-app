import { api } from '../utils/api';

export async function getBudgets() {
	const { data } = await api.get('/budgets');
	return data.budgets || [];
}

export async function upsertBudget({ category = 'ALL', limit }) {
	const { data } = await api.post('/budgets', { category, limit, period: 'monthly' });
	return data.budget;
}

export async function getBudgetStatus() {
	// Add timestamp to avoid caching
	const { data } = await api.get(`/budgets/status?_=${Date.now()}`);
	console.log('getBudgetStatus response:', data);
	return data.status || [];
}

export async function deleteBudget(category) {
	// Axios delete with body needs to use config.data
	const { data } = await api.delete('/budgets', {
		data: { category }
	});
	return data;
}

export async function convertAllBudgets(fromCurrency, toCurrency, exchangeRate) {
	const { data } = await api.post('/budgets/convert', {
		fromCurrency,
		toCurrency,
		exchangeRate
	});
	return data;
}


