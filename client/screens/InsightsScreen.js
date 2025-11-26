import { useCallback, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getForecast } from '../services/forecast';
import { fetchExpenses } from '../services/expenses';
import { getBudgetStatus } from '../services/budgets';

// 動態導入 Victory 組件
let VictoryChart, VictoryLine, VictoryTheme;
try {
	const victoryNative = require('victory-native');
	VictoryChart = victoryNative?.VictoryChart;
	VictoryLine = victoryNative?.VictoryLine;
	VictoryTheme = victoryNative?.VictoryTheme;
} catch (err) {
	console.warn('Victory components not available');
}

export default function InsightsScreen() {
	const [forecast, setForecast] = useState(null);
	const [series, setSeries] = useState([]);
	const [categoryStats, setCategoryStats] = useState([]);
	const [budgetStatus, setBudgetStatus] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const isFirstLoad = useRef(true);

	const loadData = useCallback(async (showLoading = false) => {
		if (showLoading) {
			setLoading(true);
		}
		setRefreshing(true);
		try {
			const [f, expenses, budgets] = await Promise.all([
				getForecast().catch(() => null),
				fetchExpenses().catch(() => []),
				getBudgetStatus().catch(() => [])
			]);
			
			setForecast(f);
			setBudgetStatus(budgets);

			// 依日期聚合，做簡單趨勢線
			const byDay = new Map();
			for (const e of expenses) {
				const d = new Date(e.date);
				const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
				byDay.set(key, (byDay.get(key) || 0) + Number(e.amount || 0));
			}
			const pts = Array.from(byDay.entries()).map(([k, v]) => ({ x: new Date(k), y: v }));
			pts.sort((a, b) => a.x - b.x);
			setSeries(pts);

			// 類別統計
			const categoryMap = new Map();
			for (const e of expenses) {
				const cat = e.category || 'Uncategorized';
				categoryMap.set(cat, (categoryMap.get(cat) || 0) + Number(e.amount || 0));
			}
			const stats = Array.from(categoryMap.entries())
				.map(([category, total]) => ({ category, total }))
				.sort((a, b) => b.total - a.total)
				.slice(0, 5); // 前 5 大類別
			setCategoryStats(stats);
		} catch (err) {
			console.error('載入洞察數據失敗:', err);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, []);

	// 當頁面獲得焦點時自動刷新
	useFocusEffect(
		useCallback(() => {
			console.log('InsightsScreen 獲得焦點，刷新數據');
			const showLoading = isFirstLoad.current;
			if (isFirstLoad.current) {
				isFirstLoad.current = false;
			}
			loadData(showLoading);
		}, [loadData])
	);

	const onRefresh = () => {
		setRefreshing(true);
		loadData();
	};

	if (loading) {
		return (
			<View style={[styles.container, styles.center]}>
				<ActivityIndicator size="large" color="#007AFF" />
				<Text style={styles.loadingText}>Loading...</Text>
			</View>
		);
	}

	return (
		<ScrollView
			style={styles.container}
			refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
		>
			<Text style={styles.title}>Insights & Forecast</Text>

			{/* Forecast Card */}
			{forecast && (
				<View style={styles.card}>
					<Text style={styles.cardTitle}>Monthly Forecast</Text>
					<View style={styles.statRow}>
						<View style={styles.statItem}>
							<Text style={styles.statLabel}>Spent</Text>
							<Text style={styles.statValue}>${forecast.spent.toFixed(0)}</Text>
						</View>
						<View style={styles.statItem}>
							<Text style={styles.statLabel}>Avg Daily</Text>
							<Text style={styles.statValue}>${forecast.avgPerDay.toFixed(0)}</Text>
						</View>
						<View style={styles.statItem}>
							<Text style={styles.statLabel}>Forecast</Text>
							<Text style={[styles.statValue, styles.forecastValue]}>
								${forecast.forecast.toFixed(0)}
							</Text>
						</View>
					</View>
				</View>
			)}

			{/* Budget Status - Only show ALL category */}
			{budgetStatus.filter((b) => b.category === 'ALL').length > 0 && (
				<View style={styles.card}>
					<Text style={styles.cardTitle}>Budget Status</Text>
					{budgetStatus
						.filter((budget) => budget.category === 'ALL')
						.map((budget) => {
							const ratio = budget.limit > 0 ? budget.spent / budget.limit : 0;
							const percent = Math.min(100, Math.round(ratio * 100));
							return (
								<View key={budget.category} style={styles.budgetItem}>
									<View style={styles.budgetHeader}>
										<Text style={styles.budgetCategory}>Total Budget</Text>
										<Text style={styles.budgetAmount}>
											${budget.spent.toFixed(0)} / ${budget.limit.toFixed(0)}
										</Text>
									</View>
									<View style={styles.progressBar}>
										<View
											style={[
												styles.progressFill,
												{
													width: `${percent}%`,
													backgroundColor: percent >= 100 ? '#FF3B30' : percent >= 80 ? '#FF9500' : '#34C759'
												}
											]}
										/>
									</View>
									<Text style={styles.budgetPercent}>{percent}%</Text>
								</View>
							);
						})}
				</View>
			)}

			{/* Trend Chart */}
			{series.length > 0 && VictoryChart && VictoryLine ? (
				<View style={styles.card}>
					<Text style={styles.cardTitle}>Daily Expense Trend</Text>
					<View style={styles.chartContainer}>
						<VictoryChart
							scale={{ x: 'time' }}
							height={260}
							width={360}
							padding={{ left: 50, right: 20, top: 20, bottom: 50 }}
						>
							<VictoryLine
								data={series}
								style={{
									data: { stroke: '#007AFF', strokeWidth: 2 },
									parent: { border: '1px solid #ccc' }
								}}
							/>
						</VictoryChart>
					</View>
				</View>
			) : series.length > 0 ? (
				<View style={styles.card}>
					<Text style={styles.cardTitle}>Daily Expense Trend</Text>
					<Text style={styles.fallbackText}>Chart component unavailable, showing data points:</Text>
					{series.slice(-7).map((point, index) => (
						<View key={index} style={styles.dataPoint}>
							<Text style={styles.dataDate}>
								{point.x.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
							</Text>
							<Text style={styles.dataValue}>${point.y.toFixed(0)}</Text>
						</View>
					))}
				</View>
			) : null}

			{/* Category Statistics */}
			{categoryStats.length > 0 && (
				<View style={styles.card}>
					<Text style={styles.cardTitle}>Top Expense Categories</Text>
					{categoryStats.map((stat, index) => (
						<View key={index} style={styles.categoryItem}>
							<View style={styles.categoryRank}>
								<Text style={styles.rankNumber}>{index + 1}</Text>
							</View>
							<View style={styles.categoryInfo}>
								<Text style={styles.categoryName}>{stat.category}</Text>
								<Text style={styles.categoryAmount}>${stat.total.toFixed(0)}</Text>
							</View>
						</View>
					))}
				</View>
			)}

			{!forecast && series.length === 0 && categoryStats.length === 0 && (
				<View style={styles.emptyContainer}>
					<Text style={styles.emptyText}>No Data</Text>
					<Text style={styles.emptySubtext}>Start recording expenses to see insights here</Text>
				</View>
			)}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 16,
		backgroundColor: '#f5f5f5'
	},
	center: {
		justifyContent: 'center',
		alignItems: 'center'
	},
	loadingText: {
		marginTop: 12,
		color: '#666',
		fontSize: 14
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 16,
		color: '#000'
	},
	card: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3
	},
	cardTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 12,
		color: '#000'
	},
	statRow: {
		flexDirection: 'row',
		justifyContent: 'space-around'
	},
	statItem: {
		alignItems: 'center'
	},
	statLabel: {
		fontSize: 12,
		color: '#666',
		marginBottom: 4
	},
	statValue: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#000'
	},
	forecastValue: {
		color: '#007AFF'
	},
	budgetItem: {
		marginBottom: 12
	},
	budgetHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 6
	},
	budgetCategory: {
		fontSize: 14,
		fontWeight: '600',
		color: '#000'
	},
	budgetAmount: {
		fontSize: 14,
		color: '#666'
	},
	progressBar: {
		height: 8,
		backgroundColor: '#e0e0e0',
		borderRadius: 4,
		overflow: 'hidden',
		marginBottom: 4
	},
	progressFill: {
		height: '100%',
		borderRadius: 4
	},
	budgetPercent: {
		fontSize: 12,
		color: '#666',
		textAlign: 'right'
	},
	chartContainer: {
		alignItems: 'center',
		backgroundColor: '#fafafa',
		borderRadius: 8,
		padding: 8
	},
	fallbackText: {
		fontSize: 14,
		color: '#666',
		marginBottom: 12
	},
	dataPoint: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: '#eee'
	},
	dataDate: {
		fontSize: 14,
		color: '#666'
	},
	dataValue: {
		fontSize: 14,
		fontWeight: '600',
		color: '#000'
	},
	categoryItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0'
	},
	categoryRank: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#007AFF',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12
	},
	rankNumber: {
		color: '#fff',
		fontWeight: 'bold',
		fontSize: 14
	},
	categoryInfo: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center'
	},
	categoryName: {
		fontSize: 16,
		color: '#000'
	},
	categoryAmount: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#000'
	},
	emptyContainer: {
		alignItems: 'center',
		paddingVertical: 40
	},
	emptyText: {
		fontSize: 18,
		color: '#666',
		marginBottom: 8
	},
	emptySubtext: {
		fontSize: 14,
		color: '#999'
	}
});


