import { View, Text, StyleSheet } from 'react-native';
import { getCurrency, formatCurrencySync } from '../utils/currencySettings';
import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

// Dynamically import Victory components
let VictoryChart, VictoryPie;
try {
	const victoryNative = require('victory-native');
	VictoryChart = victoryNative?.VictoryChart;
	VictoryPie = victoryNative?.VictoryPie;
} catch (err) {
	console.warn('Victory components not available, using fallback UI');
}

// Color palette
const COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#FF2D55', '#5AC8FA', '#FFCC00'];

export default function BudgetChart({ data }) {
	const { theme, isDarkMode } = useTheme();
	const [currency, setCurrency] = useState('USD');

	useEffect(() => {
		loadCurrency();
	}, []);

	async function loadCurrency() {
		const curr = await getCurrency();
		setCurrency(curr);
	}

	const styles = getStyles(theme, isDarkMode);

	if (!data || data.length === 0) {
		return (
			<View style={styles.emptyContainer}>
				<Text style={styles.emptyText}>No expense data</Text>
			</View>
		);
	}

	// Get category color
	function getCategoryColor(index) {
		return COLORS[index % COLORS.length];
	}

	// If VictoryPie and VictoryChart are available, show pie chart
	if (VictoryPie && VictoryChart) {
		return (
			<View style={styles.chartContainer}>
				<VictoryChart width={320} height={260}>
					<VictoryPie
						data={data.map((item, index) => ({
							x: item.category,
							y: item.total,
							fill: getCategoryColor(index)
						}))}
						innerRadius={60}
						labelRadius={({ innerRadius }) => innerRadius + 40}
						labels={({ datum }) => `${datum.x}\n${formatCurrencySync(datum.y, currency)}`}
						style={{
							labels: { fontSize: 10, fill: theme.text, fontWeight: '500' }
						}}
					/>
				</VictoryChart>
				{/* 圖例 */}
				<View style={styles.legendContainer}>
					{data.slice(0, 6).map((item, index) => (
						<View key={index} style={styles.legendItem}>
							<View style={[styles.legendColor, { backgroundColor: getCategoryColor(index) }]} />
							<Text style={styles.legendText} numberOfLines={1}>
								{item.category}
							</Text>
							<Text style={styles.legendAmount}>
								{formatCurrencySync(item.total, currency)}
							</Text>
						</View>
					))}
				</View>
			</View>
		);
	}

	// Fallback: show list
	return (
		<View style={styles.fallbackContainer}>
			{data.map((item, index) => (
				<View key={index} style={styles.fallbackItem}>
					<View style={styles.fallbackLeft}>
						<View style={[styles.fallbackColor, { backgroundColor: getCategoryColor(index) }]} />
						<Text style={styles.fallbackCategory}>{item.category}</Text>
					</View>
					<Text style={styles.fallbackAmount}>{formatCurrencySync(item.total, currency)}</Text>
				</View>
			))}
		</View>
	);
}

function getStyles(theme, isDarkMode) {
	return StyleSheet.create({
		emptyContainer: {
			alignItems: 'center',
			padding: 20,
		},
		emptyText: {
			color: theme.textSecondary,
			fontSize: 14,
		},
		chartContainer: {
			alignItems: 'center',
			paddingVertical: 10,
		},
		legendContainer: {
			marginTop: 16,
			width: '100%',
			paddingHorizontal: 20,
		},
		legendItem: {
			flexDirection: 'row',
			alignItems: 'center',
			marginBottom: 12,
		},
		legendColor: {
			width: 12,
			height: 12,
			borderRadius: 6,
			marginRight: 8,
		},
		legendText: {
			flex: 1,
			fontSize: 13,
			color: theme.text,
			fontWeight: '500',
		},
		legendAmount: {
			fontSize: 13,
			fontWeight: '600',
			color: theme.text,
		},
		fallbackContainer: {
			padding: 16,
		},
		fallbackItem: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			paddingVertical: 12,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		fallbackLeft: {
			flexDirection: 'row',
			alignItems: 'center',
			flex: 1,
		},
		fallbackColor: {
			width: 12,
			height: 12,
			borderRadius: 6,
			marginRight: 10,
		},
		fallbackCategory: {
			fontSize: 14,
			color: theme.text,
			fontWeight: '500',
		},
		fallbackAmount: {
			fontSize: 14,
			fontWeight: 'bold',
			color: theme.text,
		},
	});
}


