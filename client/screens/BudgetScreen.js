import { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { getBudgets, upsertBudget, getBudgetStatus } from '../services/budgets';

export default function BudgetScreen() {
	const [overall, setOverall] = useState('');
	const [food, setFood] = useState('');
	const [transport, setTransport] = useState('');
	const [status, setStatus] = useState([]);
	const [loading, setLoading] = useState(false);

	async function load() {
		const [budgets, s] = await Promise.all([getBudgets(), getBudgetStatus()]);
		setStatus(s);
		const map = new Map(budgets.map((b) => [`${b.category}:${b.period}`, b]));
		setOverall(map.get('ALL:monthly')?.limit?.toString?.() || '');
		setFood(map.get('飲食:monthly')?.limit?.toString?.() || '');
		setTransport(map.get('交通:monthly')?.limit?.toString?.() || '');
	}

	useEffect(() => {
		load();
	}, []);

	async function save() {
		try {
			setLoading(true);
			const ops = [];
			if (overall) ops.push(upsertBudget({ category: 'ALL', limit: Number(overall) }));
			if (food) ops.push(upsertBudget({ category: '飲食', limit: Number(food) }));
			if (transport) ops.push(upsertBudget({ category: '交通', limit: Number(transport) }));
			await Promise.all(ops);
			Alert.alert('已儲存預算');
			await load();
		} catch {
			Alert.alert('儲存失敗');
		} finally {
			setLoading(false);
		}
	}

	return (
		<View style={styles.container}>
			<Text style={styles.title}>預算設定（月）</Text>
			<TextInput style={styles.input} placeholder="總預算（ALL）" keyboardType="numeric" value={overall} onChangeText={setOverall} />
			<TextInput style={styles.input} placeholder="飲食預算" keyboardType="numeric" value={food} onChangeText={setFood} />
			<TextInput style={styles.input} placeholder="交通預算" keyboardType="numeric" value={transport} onChangeText={setTransport} />
			<Button title={loading ? '儲存中...' : '儲存'} onPress={save} disabled={loading} />
			<View style={{ height: 16 }} />
			<Text style={styles.title}>預算狀態</Text>
			{status.map((s) => (
				<Text key={s.category} style={styles.status}>
					{`${s.category}: $${s.spent.toFixed(0)} / $${s.limit.toFixed(0)} (${Math.round(s.ratio * 100)}%)`}
				</Text>
			))}
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


