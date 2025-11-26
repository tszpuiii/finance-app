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
	const { data } = await api.get('/budgets/status');
	return data.status || [];
}


