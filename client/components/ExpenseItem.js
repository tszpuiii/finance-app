import { View, Text, StyleSheet, Button } from 'react-native';

export default function ExpenseItem({ expense, onDelete }) {
	return (
		<View style={styles.row}>
			<View style={{ flex: 1 }}>
				<Text style={styles.category}>{expense.category}</Text>
				<Text style={styles.date}>{new Date(expense.date).toLocaleString()}</Text>
			</View>
			<View style={{ alignItems: 'flex-end' }}>
				<Text style={styles.amount}>${expense.amount.toFixed(2)}</Text>
				{onDelete ? <Button title="刪除" onPress={() => onDelete(expense)} /> : null}
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
	amount: { fontSize: 16, fontWeight: '600' },
});


