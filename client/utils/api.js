import axios from 'axios';
import { API_BASE_URL } from '../constants/apiUrl';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const api = axios.create({
	baseURL: API_BASE_URL,
	timeout: 10000,
});

api.interceptors.request.use(async (config) => {
	try {
		const token = await AsyncStorage.getItem('authToken');
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
	} catch {}
	return config;
});

// Response interceptor to handle 401 errors
api.interceptors.response.use(
	(response) => response,
	async (error) => {
		if (error.response?.status === 401) {
			// Clear token on 401 (unauthorized)
			try {
				await AsyncStorage.removeItem('authToken');
				console.log('Token cleared due to 401 error');
			} catch (e) {
				console.error('Error clearing token:', e);
			}
		}
		return Promise.reject(error);
	}
);

// Mock mode: enabled when EXPO_PUBLIC_API_URL=mock (for UI preview only)
if (API_BASE_URL === 'mock') {
	// Simple in-memory fake data
	let mockToken = 'mock-token';
	let mockUser = { id: 'u1', email: 'demo@example.com' };
	// Mock data stored in module-level variables, but starts from empty array on each fetch
	// This ensures deleted items won't reappear
	let mockExpenses = [];
	let mockBudgets = [
		{ _id: 'b1', userId: 'u1', category: 'ALL', limit: 2000, period: 'monthly' },
		{ _id: 'b2', userId: 'u1', category: 'Food', limit: 800, period: 'monthly' },
		{ _id: 'b3', userId: 'u1', category: 'Transport', limit: 300, period: 'monthly' },
	];

	api.interceptors.request.use(async (config) => {
		// Override adapter to intercept all requests and return fake data
		config.adapter = async () => {
			const url = config.url || '';
			const method = (config.method || 'get').toLowerCase();

			function res(data, status = 200) {
				return Promise.resolve({
					data,
					status,
					statusText: 'OK',
					headers: {},
					config,
					request: {},
				});
			}

			// Auth
			if (url.startsWith('/auth/login') && method === 'post') {
				// Note: Don't set token in mock API, let LoginScreen's saveToken handle it
				// This ensures logic consistency
				return res({ token: mockToken, user: mockUser });
			}
			if (url.startsWith('/auth/register') && method === 'post') {
				return res({ id: 'u1', email: config.data?.email || 'demo@example.com' }, 201);
			}
			if (url.startsWith('/auth/me') && method === 'get') {
				return res({ 
					id: mockUser.id, 
					_id: mockUser.id,
					email: mockUser.email,
					createdAt: new Date().toISOString()
				});
			}

			// Expenses
			if (url === '/expenses' && method === 'get') {
				// Return copy of current mockExpenses (deleted items won't reappear)
				return res({ expenses: [...mockExpenses].reverse() });
			}
			if (url === '/expenses' && method === 'post') {
				const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
				const newItem = {
					_id: `e${Date.now()}`,
					userId: 'u1',
					amount: Number(body.amount) || 0,
					category: body.category || 'Uncategorized',
					date: new Date().toISOString(),
					location: body.location,
					locationName: body.locationName,
					note: body.note,
					receiptImage: body.receiptImage,
				};
				mockExpenses.push(newItem);
				// Simple budget alert
				const totals = mockExpenses.reduce((a, e) => {
					a[e.category] = (a[e.category] || 0) + Number(e.amount);
					return a;
				}, {});
				const overall = mockExpenses.reduce((a, e) => a + Number(e.amount), 0);
				let alert = null;
				for (const b of mockBudgets) {
					const spent = b.category === 'ALL' ? overall : (totals[b.category] || 0);
					if (b.limit > 0) {
						const ratio = spent / b.limit;
						if (ratio >= 1) {
							alert = { type: 'budget_exceeded', category: b.category, percent: 100, spent, limit: b.limit };
							break;
						} else if (!alert && ratio >= 0.8) {
							alert = { type: 'budget_warning', category: b.category, percent: Math.round(ratio * 100), spent, limit: b.limit };
						}
					}
				}
				return res({ expense: newItem, alert }, 201);
			}
			if (url?.startsWith('/expenses/') && method === 'delete') {
				const id = url.split('/').pop();
				mockExpenses = mockExpenses.filter((e) => e._id !== id);
				return res({ ok: true });
			}

			// Budgets
			if (url === '/budgets' && method === 'get') {
				return res({ budgets: mockBudgets });
			}
			if (url === '/budgets' && method === 'post') {
				const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
				const idx = mockBudgets.findIndex((b) => b.category === body.category && b.period === 'monthly');
				if (idx >= 0) {
					mockBudgets[idx] = { ...mockBudgets[idx], limit: Number(body.limit) || 0 };
					return res({ budget: mockBudgets[idx] });
				}
				const created = {
					_id: `b${Date.now()}`,
					userId: 'u1',
					category: body.category,
					limit: Number(body.limit) || 0,
					period: 'monthly',
				};
				mockBudgets.push(created);
				return res({ budget: created });
			}
			if (url === '/budgets' && method === 'delete') {
				const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
				const category = body?.category;
				if (!category) {
					return res({ error: 'Category required' }, 400);
				}
				if (category === 'ALL') {
					return res({ error: 'Cannot delete ALL category' }, 400);
				}
				const idx = mockBudgets.findIndex((b) => b.category === category && b.period === 'monthly');
				if (idx >= 0) {
					mockBudgets.splice(idx, 1);
					return res({ ok: true });
				}
				return res({ error: 'Budget not found' }, 404);
			}
			if (url.startsWith('/budgets/status') && method === 'get') {
				// 計算每個類別的支出總額
				const totals = mockExpenses.reduce((a, e) => {
					const cat = e.category || 'Uncategorized';
					a[cat] = (a[cat] || 0) + Number(e.amount || 0);
					return a;
				}, {});
				const overall = mockExpenses.reduce((a, e) => a + Number(e.amount || 0), 0);
				
				// 為每個預算計算狀態
				const status = mockBudgets.map((b) => {
					const spent = b.category === 'ALL' ? overall : (totals[b.category] || 0);
					const ratio = b.limit > 0 ? spent / b.limit : 0;
					return { 
						category: b.category, 
						limit: b.limit, 
						spent, 
						ratio: Math.min(ratio, 999) // 限制最大比例，避免無限大
					};
				});
				
				// 按 category 排序，ALL 放在最前面
				status.sort((a, b) => {
					if (a.category === 'ALL') return -1;
					if (b.category === 'ALL') return 1;
					return a.category.localeCompare(b.category);
				});
				
				return res({ status });
			}

			// Forecast
			if (url === '/forecast' && method === 'get') {
				const spent = mockExpenses.reduce((a, e) => a + Number(e.amount), 0);
				const avgPerDay = Math.round(spent / 10);
				const forecast = spent + avgPerDay * 10;
				return res({ month: new Date().getMonth() + 1, spent, avgPerDay, forecast });
			}

			// 其他回傳 404
			return res({ error: 'Not found (mock)' }, 404);
		};
		return config;
	});
}

