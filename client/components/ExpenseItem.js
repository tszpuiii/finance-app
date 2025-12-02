import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { getCurrency, formatCurrencySync } from '../utils/currencySettings';
import { useTheme } from '../contexts/ThemeContext';

export default function ExpenseItem({ expense, onDelete, onPress, navigation }) {
	const { theme, isDarkMode } = useTheme();
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
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);
		
		if (d.toDateString() === today.toDateString()) {
			return 'Today ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
		} else if (d.toDateString() === yesterday.toDateString()) {
			return 'Yesterday ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
		} else {
			return d.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
				year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
			}) + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
	}
	}

	function handlePress() {
		if (onPress) {
			onPress(expense);
		} else if (navigation) {
			navigation.navigate('ExpenseDetail', { expense });
		}
	}

	const styles = getStyles(theme, isDarkMode);

	const content = (
		<View style={styles.row}>
			<View style={styles.leftSection}>
				<View style={styles.categoryRow}>
					<View style={styles.categoryBadge}>
						<Text style={styles.categoryText}>{expense.category}</Text>
					</View>
					{expense.note && (
						<Text style={styles.noteIndicator}>📝</Text>
					)}
				</View>
				<Text style={styles.date}>{formatDate(expense.date)}</Text>
					{expense.locationName && (
					<Text style={styles.location} numberOfLines={1}>
						📍 {expense.locationName}
					</Text>
					)}
				{expense.note && (
					<Text style={styles.notePreview} numberOfLines={1}>
						{expense.note}
				</Text>
				)}
			</View>
			<View style={styles.rightSection}>
				<Text style={styles.amount}>
					{formatCurrencySync(expense.amount, currency)}
				</Text>
				{onDelete && (
					<TouchableOpacity 
						style={styles.deleteButton} 
						onPress={() => onDelete(expense)}
					>
						<Text style={styles.deleteButtonText}>Delete</Text>
					</TouchableOpacity>
				)}
			</View>
		</View>
	);

	if (onPress || navigation) {
		return (
			<TouchableOpacity 
				style={styles.touchableRow}
				onPress={handlePress}
				activeOpacity={0.7}
			>
				{content}
			</TouchableOpacity>
		);
	}

	return content;
}

function getStyles(theme, isDarkMode) {
	return StyleSheet.create({
		touchableRow: {
			backgroundColor: theme.card,
			marginHorizontal: 16,
			marginVertical: 6,
			borderRadius: 12,
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 1 },
			shadowOpacity: isDarkMode ? 0.3 : 0.1,
			shadowRadius: 2,
			elevation: 2,
		},
	row: {
			flexDirection: 'row',
			alignItems: 'flex-start',
			justifyContent: 'space-between',
			padding: 16,
		},
		leftSection: {
			flex: 1,
			marginRight: 12,
		},
		categoryRow: {
		flexDirection: 'row',
		alignItems: 'center',
			marginBottom: 6,
		},
		categoryBadge: {
			backgroundColor: theme.primary,
			paddingHorizontal: 10,
			paddingVertical: 4,
			borderRadius: 12,
			marginRight: 8,
	},
		categoryText: {
			fontSize: 13,
			fontWeight: '600',
			color: '#fff',
		},
		noteIndicator: {
			fontSize: 14,
		},
		date: {
			fontSize: 12,
			color: theme.textSecondary,
			marginBottom: 4,
		},
		location: {
			fontSize: 12,
			color: theme.primary,
			marginTop: 2,
		},
		notePreview: {
			fontSize: 12,
			color: theme.textTertiary,
			marginTop: 4,
			fontStyle: 'italic',
		},
		rightSection: {
			alignItems: 'flex-end',
		},
		amount: {
			fontSize: 18,
			fontWeight: 'bold',
			color: theme.text,
			marginBottom: 8,
		},
		deleteButton: {
			backgroundColor: theme.error,
			paddingHorizontal: 12,
			paddingVertical: 6,
			borderRadius: 6,
		},
		deleteButtonText: {
			color: '#fff',
			fontSize: 12,
			fontWeight: '600',
		},
});
}


