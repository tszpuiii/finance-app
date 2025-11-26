import AsyncStorage from '@react-native-async-storage/async-storage';
import { createExpense } from '../services/expenses';

const QUEUE_KEY = 'pendingExpensesQueue';

export async function queueExpense(payload) {
	const raw = (await AsyncStorage.getItem(QUEUE_KEY)) || '[]';
	const arr = JSON.parse(raw);
	arr.push({ id: `${Date.now()}-${Math.random()}`, payload });
	await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(arr));
}

export async function getPendingExpenses() {
	const raw = (await AsyncStorage.getItem(QUEUE_KEY)) || '[]';
	return JSON.parse(raw);
}

export async function clearPendingExpenses() {
	await AsyncStorage.setItem(QUEUE_KEY, '[]');
}

export async function syncPendingExpenses() {
	const pending = await getPendingExpenses();
	if (!pending.length) return 0;
	const remain = [];
	for (const item of pending) {
		try {
			await createExpense(item.payload);
		} catch {
			remain.push(item);
		}
	}
	await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remain));
	return pending.length - remain.length;
}


