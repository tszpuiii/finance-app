import { api } from '../utils/api';

export async function fetchExpenses() {
	const { data } = await api.get('/expenses');
	return data.expenses || [];
}

export async function createExpense(payload) {
	const { data } = await api.post('/expenses', payload);
	return data;
}

export async function deleteExpense(id) {
	const { data } = await api.delete(`/expenses/${id}`);
	return data;
}


