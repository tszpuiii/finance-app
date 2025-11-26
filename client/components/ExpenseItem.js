import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { getCurrency, formatCurrencySync, getCurrencySymbol } from '../utils/currencySettings';

export default function ExpenseItem({ expense, onDelete }) {
	const [currency, setCurrency] = useState('USD');

	useEffect(() => {
		loadCurrency();
	}, []);

	async function loadCurrency() {
		const curr = await getCurrency();
		setCurrency(curr);
	}

	function formatDate(date) {
		const d = new Date(date);
		return d.toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	return (
		<View style={styles.row}>
			<View style={{ flex: 1 }}>
				<Text style={styles.category}>{expense.category}</Text>
				<Text style={styles.date}>
					{formatDate(expense.date)}
					{expense.locationName && (
						<Text style={styles.location}> • {expense.locationName}</Text>
					)}
				</Text>
			</View>
			<View style={{ alignItems: 'flex-end' }}>
				<Text style={styles.amount}>
					{formatCurrencySync(expense.amount, currency)}
				</Text>
				{onDelete ? <Button title="Delete" onPress={() => onDelete(expense)} /> : null}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	category: { fontSize: 16, fontWeight: '600' },
	date: { fontSize: 12, color: '#666', marginTop: 2 },
	location: { fontSize: 12, color: '#007AFF', fontStyle: 'italic' },
	amount: { fontSize: 16, fontWeight: '600' },
});


