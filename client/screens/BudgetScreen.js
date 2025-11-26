import { useCallback, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getBudgets, upsertBudget, getBudgetStatus } from '../services/budgets';

export default function BudgetScreen() {
	const [overall, setOverall] = useState('');
	const [food, setFood] = useState('');
	const [transport, setTransport] = useState('');
	const [status, setStatus] = useState([]);
	const [loading, setLoading] = useState(false);

	const load = useCallback(async () => {
		try {
			console.log('Loading budget data...');
			const [budgets, s] = await Promise.all([getBudgets(), getBudgetStatus()]);
			console.log('Received budgets:', budgets);
			console.log('Received budget status:', s);
			console.log('Status array length:', s?.length);
			if (s && s.length > 0) {
				console.log('Status items:', s.map(item => `${item.category}: $${item.spent}/${item.limit}`));
			}
			setStatus(s || []);
			const map = new Map(budgets.map((b) => [`${b.category}:${b.period}`, b]));
			setOverall(map.get('ALL:monthly')?.limit?.toString?.() || '');
			setFood(map.get('Food:monthly')?.limit?.toString?.() || '');
			setTransport(map.get('Transport:monthly')?.limit?.toString?.() || '');
			console.log('Budget status updated in state');
		} catch (err) {
			console.error('Failed to load budget data:', err);
			console.error('Error details:', err.response?.data || err.message);
			Alert.alert('Load Failed', err.message || 'Failed to load budget data');
		}
	}, []);

	// 當頁面獲得焦點時自動刷新
	useFocusEffect(
		useCallback(() => {
			console.log('BudgetScreen 獲得焦點，刷新數據');
			load();
		}, [load])
	);

	async function save() {
		try {
			setLoading(true);
			const ops = [];
			if (overall) ops.push(upsertBudget({ category: 'ALL', limit: Number(overall) }));
			if (food) ops.push(upsertBudget({ category: 'Food', limit: Number(food) }));
			if (transport) ops.push(upsertBudget({ category: 'Transport', limit: Number(transport) }));
			await Promise.all(ops);
			console.log('Budget saved, refreshing status...');
			// Force refresh status after saving
			await load();
			Alert.alert('Budget Saved');
		} catch (err) {
			console.error('Save budget error:', err);
			Alert.alert('Save Failed', err.message || 'Please try again');
		} finally {
			setLoading(false);
		}
	}

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Budget Settings (Monthly)</Text>
			<TextInput style={styles.input} placeholder="Total Budget (ALL)" keyboardType="numeric" value={overall} onChangeText={setOverall} />
			<TextInput style={styles.input} placeholder="Food Budget" keyboardType="numeric" value={food} onChangeText={setFood} />
			<TextInput style={styles.input} placeholder="Transport Budget" keyboardType="numeric" value={transport} onChangeText={setTransport} />
			<Button title={loading ? 'Saving...' : 'Save'} onPress={save} disabled={loading} />
			<View style={{ height: 16 }} />
			<Text style={styles.title}>Budget Status</Text>
			{(() => {
				const allBudget = status.find((s) => s.category === 'ALL');
				if (!allBudget) {
					return <Text style={styles.status}>No Total Budget (ALL) set. Please set a Total Budget above.</Text>;
				}
				return (
					<Text style={styles.status}>
						{`Total Budget: $${allBudget.spent.toFixed(0)} / $${allBudget.limit.toFixed(0)} (${Math.round(allBudget.ratio * 100)}%)`}
					</Text>
				);
			})()}
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 24 },
	title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
	input: {
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		padding: 12,
		marginBottom: 12,
	},
	status: { fontSize: 14, color: '#333', marginBottom: 6 },
});


