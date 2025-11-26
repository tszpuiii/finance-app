import { useCallback, useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, FlatList, RefreshControl, TextInput, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fetchExpenses, deleteExpense } from '../services/expenses';
import { syncPendingExpenses } from '../utils/sync';
import ExpenseItem from '../components/ExpenseItem';
import BudgetChart from '../components/BudgetChart';
import { getCurrency } from '../utils/currencySettings';

export default function DashboardScreen({ navigation }) {
	const [expenses, setExpenses] = useState([]);
	const [refreshing, setRefreshing] = useState(false);
	const [query, setQuery] = useState('');

	const load = useCallback(async () => {
		setRefreshing(true);
		try {
			const items = await fetchExpenses();
			setExpenses(items);
		} finally {
			setRefreshing(false);
		}
	}, []);

	useFocusEffect(
		useCallback(() => {
			(async () => {
				await syncPendingExpenses();
				await load();
			})();
		}, [load])
	);

	const categoryTotals = Object.values(
		expenses.reduce((acc, e) => {
			const key = e.category || 'Uncategorized';
			if (!acc[key]) acc[key] = { category: key, total: 0 };
			acc[key].total += Number(e.amount || 0);
			return acc;
		}, {})
	);

	const filtered = expenses.filter((e) => {
		if (!query) return true;
		const q = query.toLowerCase();
		return (e.category || '').toLowerCase().includes(q) || (e.note || '').toLowerCase().includes(q);
	});

	async function onDelete(item) {
		try {
			await deleteExpense(item._id);
			setExpenses((prev) => prev.filter((x) => x._id !== item._id));
		} catch {
			Alert.alert('Delete Failed');
		}
	}

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Dashboard</Text>
			<BudgetChart data={categoryTotals} />
			<View style={{ height: 8 }} />
			<View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' }}>
				<Button title="Add Expense" onPress={() => navigation.navigate('AddExpense')} />
				<Button title="Budget" onPress={() => navigation.navigate('Budget')} />
				<Button title="Insights" onPress={() => navigation.navigate('Insights')} />
				<Button title="Currency" onPress={() => navigation.navigate('CurrencySettings')} />
			</View>
			<View style={{ height: 16 }} />
			<TextInput
				placeholder="Search (category/note)"
				value={query}
				onChangeText={setQuery}
				style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 8, marginBottom: 8 }}
			/>
			<Text style={styles.subtitle}>Recent Expenses</Text>
			<FlatList
				data={filtered}
				keyExtractor={(item) => item._id}
				renderItem={({ item }) => <ExpenseItem expense={item} onDelete={onDelete} />}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
				ListEmptyComponent={<Text style={{ color: '#666' }}>No expenses yet. Add one to get started!</Text>}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 24,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 16,
		color: '#444',
	},
});


