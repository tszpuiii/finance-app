import { useCallback, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchExpenses } from '../services/expenses';
import { getBudgetStatus } from '../services/budgets';
import { getCurrency, formatCurrencySync } from '../utils/currencySettings';
import { useTheme } from '../contexts/ThemeContext';

// 動態導入 Victory 組件
let VictoryChart, VictoryLine, VictoryBar, VictoryPie, VictoryTheme;
try {
	const victoryNative = require('victory-native');
	VictoryChart = victoryNative?.VictoryChart;
	VictoryLine = victoryNative?.VictoryLine;
	VictoryBar = victoryNative?.VictoryBar;
	VictoryPie = victoryNative?.VictoryPie;
	VictoryTheme = victoryNative?.VictoryTheme;
} catch (err) {
	console.warn('Victory components not available');
}

// 顏色調色板
const COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#FF2D55', '#5AC8FA', '#FFCC00'];

export default function InsightsScreen() {
	const { theme, isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const [series, setSeries] = useState([]);
	const [categoryStats, setCategoryStats] = useState([]);
	const [budgetStatus, setBudgetStatus] = useState([]);
	const [totalSpent, setTotalSpent] = useState(0);
	const [avgDaily, setAvgDaily] = useState(0);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [currency, setCurrency] = useState('USD');
	const isFirstLoad = useRef(true);

	useEffect(() => {
		loadCurrency();
	}, []);

	async function loadCurrency() {
		const curr = await getCurrency();
		setCurrency(curr);
	}

	const loadData = useCallback(async (showLoading = false) => {
		if (showLoading) {
			setLoading(true);
		}
		setRefreshing(true);
		try {
			const [allExpenses, budgets] = await Promise.all([
				fetchExpenses().catch(() => []),
				getBudgetStatus().catch(() => [])
			]);
			
			setBudgetStatus(budgets);

			// 只計算當月的支出（與預算狀態保持一致）
			const now = new Date();
			const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
			const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
			const expenses = allExpenses.filter(e => {
				const expenseDate = new Date(e.date);
				return expenseDate >= monthStart && expenseDate <= monthEnd;
			});

			// 計算總支出和平均每日支出（僅當月）
			const total = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
			setTotalSpent(total);
			
			// 計算平均每日支出（基於有支出的天數）
			const byDay = new Map();
			for (const e of expenses) {
				const d = new Date(e.date);
				const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
				byDay.set(key, (byDay.get(key) || 0) + Number(e.amount || 0));
			}
			const daysWithExpenses = byDay.size || 1;
			setAvgDaily(total / daysWithExpenses);

			// 依日期聚合，做簡單趨勢線
			const pts = Array.from(byDay.entries()).map(([k, v]) => ({ x: new Date(k), y: v }));
			pts.sort((a, b) => a.x - b.x);
			setSeries(pts);

			// 類別統計（僅當月）
			const categoryMap = new Map();
			for (const e of expenses) {
				const cat = e.category || 'Uncategorized';
				categoryMap.set(cat, (categoryMap.get(cat) || 0) + Number(e.amount || 0));
			}
			const stats = Array.from(categoryMap.entries())
				.map(([category, total]) => ({ category, total }))
				.sort((a, b) => b.total - a.total)
				.slice(0, 8); // Top 8 categories
			
			// 計算百分比：相對於總支出的百分比和相對於預算的百分比
			const actualTotal = stats.reduce((sum, s) => sum + s.total, 0);
			const statsWithPercent = stats.map(s => {
				// 找到該類別的預算
				const budget = budgets.find(b => b.category === s.category && b.category !== 'ALL');
				const budgetLimit = budget?.limit || 0;
				const budgetRatio = budgetLimit > 0 ? s.total / budgetLimit : 0;
				const budgetPercent = Math.min(100, Math.round(budgetRatio * 100));
				
				return {
					...s,
					percentage: actualTotal > 0 ? (s.total / actualTotal) * 100 : 0, // 佔總支出的百分比
					budgetLimit: budgetLimit,
					budgetPercent: budgetPercent, // 相對於預算的百分比
					budgetRatio: budgetRatio
				};
			});
			
			setCategoryStats(statsWithPercent);
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

	// 獲取進度條顏色
	function getProgressColor(ratio) {
		if (ratio >= 1) return '#FF3B30'; // 超過預算 - 紅色
		if (ratio >= 0.8) return '#FF9500'; // 接近預算 - 橙色
		return '#34C759'; // 正常 - 綠色
	}

	// 獲取類別顏色
	function getCategoryColor(index) {
		return COLORS[index % COLORS.length];
	}

	const styles = getStyles(theme, isDarkMode);

	if (loading) {
		return (
			<View style={[styles.container, styles.center]}>
				<ActivityIndicator size="large" color={theme.primary} />
				<Text style={styles.loadingText}>Loading insights...</Text>
			</View>
		);
	}

	const maxCategoryAmount = categoryStats.length > 0 ? Math.max(...categoryStats.map(s => s.total)) : 0;

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={{ paddingTop: insets.top }}
			refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
			showsVerticalScrollIndicator={false}
		>
			<Text style={styles.title}>📊 Insights</Text>
			<Text style={styles.subtitle}>Your spending analytics</Text>

			{/* Total Budget Overview */}
			{(() => {
				const totalBudget = budgetStatus.find(b => b.category === 'ALL');
				if (totalBudget && totalBudget.limit > 0) {
					const budgetRatio = totalBudget.spent / totalBudget.limit;
					const budgetPercent = Math.min(100, Math.round(budgetRatio * 100));
					const remaining = Math.max(0, totalBudget.limit - totalBudget.spent);
					const isOverBudget = totalBudget.spent > totalBudget.limit;
					
					return (
						<View style={styles.budgetOverviewCard}>
							<View style={styles.budgetOverviewHeader}>
								<Text style={styles.budgetOverviewTitle}>💰 Total Budget Overview</Text>
								<Text style={[styles.budgetOverviewPercent, { color: getProgressColor(budgetRatio) }]}>
									{budgetPercent}%
								</Text>
							</View>
							
							<View style={styles.budgetOverviewAmounts}>
								<View style={styles.budgetAmountItem}>
									<Text style={styles.budgetAmountLabel}>Spent</Text>
									<Text style={[styles.budgetAmountValue, isOverBudget && styles.budgetAmountOver]}>
										{formatCurrencySync(totalBudget.spent, currency)}
									</Text>
								</View>
								<View style={styles.budgetAmountDivider} />
								<View style={styles.budgetAmountItem}>
									<Text style={styles.budgetAmountLabel}>Budget</Text>
									<Text style={styles.budgetAmountValue}>
										{formatCurrencySync(totalBudget.limit, currency)}
									</Text>
								</View>
								{remaining > 0 && (
									<>
										<View style={styles.budgetAmountDivider} />
										<View style={styles.budgetAmountItem}>
											<Text style={styles.budgetAmountLabel}>Remaining</Text>
											<Text style={[styles.budgetAmountValue, styles.budgetAmountRemaining]}>
												{formatCurrencySync(remaining, currency)}
											</Text>
										</View>
									</>
								)}
								{isOverBudget && (
									<>
										<View style={styles.budgetAmountDivider} />
										<View style={styles.budgetAmountItem}>
											<Text style={styles.budgetAmountLabel}>Over Budget</Text>
											<Text style={[styles.budgetAmountValue, styles.budgetAmountOver]}>
												{formatCurrencySync(totalBudget.spent - totalBudget.limit, currency)}
											</Text>
										</View>
									</>
								)}
							</View>
							
							<View style={styles.budgetOverviewProgress}>
								<View style={styles.budgetOverviewProgressBar}>
									<View
										style={[
											styles.budgetOverviewProgressFill,
											{
												width: `${Math.min(budgetPercent, 100)}%`,
												backgroundColor: getProgressColor(budgetRatio)
											}
										]}
									/>
								</View>
							</View>
							
							{isOverBudget && (
								<View style={styles.budgetWarning}>
									<Text style={styles.budgetWarningText}>⚠️ You have exceeded your total budget!</Text>
								</View>
							)}
							{budgetRatio >= 0.8 && budgetRatio < 1 && (
								<View style={styles.budgetWarning}>
									<Text style={styles.budgetWarningText}>⚠️ You're approaching your budget limit</Text>
								</View>
							)}
						</View>
					);
				}
				return null;
			})()}

			{/* Summary Cards */}
			<View style={styles.summaryRow}>
				<View style={[styles.summaryCard, styles.summaryCardPrimary]}>
					<Text style={[styles.summaryLabel, styles.summaryLabelWhite]}>Total Spent</Text>
					<Text style={[styles.summaryValue, styles.summaryValueWhite]}>
						{formatCurrencySync(totalSpent, currency)}
					</Text>
				</View>
				<View style={styles.summaryCard}>
					<Text style={styles.summaryLabel}>Avg Daily</Text>
					<Text style={styles.summaryValue}>{formatCurrencySync(avgDaily, currency)}</Text>
				</View>
			</View>

			{/* Budget Status */}
			{budgetStatus.filter((b) => {
				const oldCategories = ['交通', '飲食'];
				return !oldCategories.includes(b.category);
			}).length > 0 && (
				<View style={styles.card}>
					<Text style={styles.cardTitle}>💰 Budget Status</Text>
					{budgetStatus
						.filter((budget) => {
							const oldCategories = ['交通', '飲食'];
							return !oldCategories.includes(budget.category);
						})
						.map((budget) => {
							const ratio = budget.limit > 0 ? budget.spent / budget.limit : 0;
							const percent = Math.min(100, Math.round(ratio * 100));
							const categoryName = budget.category === 'ALL' ? 'Total Budget' : budget.category;
							return (
								<View key={budget.category} style={styles.budgetItem}>
									<View style={styles.budgetHeader}>
										<Text style={styles.budgetCategory}>{categoryName}</Text>
										<Text style={[styles.budgetPercent, { color: getProgressColor(ratio) }]}>
											{percent}%
										</Text>
									</View>
									<View style={styles.progressBar}>
										<View
											style={[
												styles.progressFill,
												{
													width: `${percent}%`,
													backgroundColor: getProgressColor(ratio)
												}
											]}
										/>
									</View>
									<Text style={styles.budgetAmount}>
										{formatCurrencySync(budget.spent, currency)} / {formatCurrencySync(budget.limit, currency)}
									</Text>
								</View>
							);
						})}
				</View>
			)}

			{/* Category Statistics with Percentage Bars */}
			{categoryStats.length > 0 && (
				<View style={styles.card}>
					<Text style={styles.cardTitle}>📈 Top Expense Categories</Text>
					
					{/* Pie Chart (if available) */}
					{categoryStats.length > 0 && VictoryPie && VictoryChart ? (
						<View style={styles.chartContainer}>
							<VictoryChart width={320} height={260}>
								<VictoryPie
									data={categoryStats.map((stat, index) => ({
										x: stat.category,
										y: stat.total,
										fill: getCategoryColor(index)
									}))}
									innerRadius={60}
									labelRadius={({ innerRadius }) => innerRadius + 40}
									labels={({ datum }) => `${datum.x}\n${formatCurrencySync(datum.y, currency)}`}
									style={{
										labels: { fontSize: 10, fill: '#333' }
									}}
								/>
							</VictoryChart>
						</View>
					) : null}

					{/* Category List with Percentage Bars */}
					{categoryStats.map((stat, index) => {
						// 如果有預算，顯示相對於預算的百分比；否則顯示佔總支出的百分比
						const hasBudget = stat.budgetLimit > 0;
						const displayPercent = hasBudget ? stat.budgetPercent : stat.percentage;
						const barWidth = hasBudget 
							? Math.min(100, (stat.budgetRatio || 0) * 100) 
							: (maxCategoryAmount > 0 ? (stat.total / maxCategoryAmount) * 100 : 0);
						const barColor = hasBudget ? getProgressColor(stat.budgetRatio || 0) : getCategoryColor(index);
						
						return (
							<View key={index} style={styles.categoryItem}>
								<View style={styles.categoryHeader}>
									<View style={[styles.categoryRank, { backgroundColor: getCategoryColor(index) }]}>
										<Text style={styles.rankNumber}>{index + 1}</Text>
									</View>
									<View style={styles.categoryInfo}>
										<View style={styles.categoryInfoLeft}>
											<Text style={styles.categoryName}>{stat.category}</Text>
											{hasBudget && (
												<Text style={styles.categoryBudget}>
													Budget: {formatCurrencySync(stat.budgetLimit, currency)}
												</Text>
											)}
										</View>
										<Text style={styles.categoryAmount}>{formatCurrencySync(stat.total, currency)}</Text>
									</View>
								</View>
								<View style={styles.percentageBarContainer}>
									<View style={styles.percentageBar}>
										<View
											style={[
												styles.percentageBarFill,
												{
													width: `${barWidth}%`,
													backgroundColor: barColor
												}
											]}
										/>
									</View>
									<View style={styles.percentageTextContainer}>
										<Text style={[styles.percentageText, { color: hasBudget ? barColor : '#666' }]}>
											{displayPercent.toFixed(1)}%
										</Text>
										{hasBudget && (
											<Text style={styles.percentageLabel}>
												of budget
											</Text>
										)}
									</View>
								</View>
							</View>
						);
					})}
				</View>
			)}

			{/* Trend Chart */}
			{series.length > 0 && (
				<View style={styles.card}>
					<Text style={styles.cardTitle}>📅 Daily Expense Trend</Text>
					{VictoryChart && VictoryLine ? (
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
										data: { stroke: '#007AFF', strokeWidth: 3 },
										parent: { border: '1px solid #ccc' }
									}}
								/>
							</VictoryChart>
						</View>
					) : (
						<View style={styles.fallbackContainer}>
							<Text style={styles.fallbackText}>Recent 7 days:</Text>
							{series.slice(-7).map((point, index) => {
								const maxAmount = Math.max(...series.map(p => p.y));
								const barWidth = maxAmount > 0 ? (point.y / maxAmount) * 100 : 0;
								return (
									<View key={index} style={styles.dataPoint}>
										<Text style={styles.dataDate}>
											{point.x.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
										</Text>
										<Text style={styles.dataValue}>{formatCurrencySync(point.y, currency)}</Text>
										<View style={styles.dataBarContainer}>
											<View style={[styles.dataBar, { width: `${barWidth}%` }]} />
										</View>
									</View>
								);
							})}
						</View>
					)}
				</View>
			)}

			{/* Empty State */}
			{series.length === 0 && categoryStats.length === 0 && budgetStatus.length === 0 && (
				<View style={styles.emptyContainer}>
					<Text style={styles.emptyIcon}>📊</Text>
					<Text style={styles.emptyText}>No Data Available</Text>
					<Text style={styles.emptySubtext}>Start recording expenses to see insights here</Text>
				</View>
			)}
		</ScrollView>
	);
}

function getStyles(theme, isDarkMode) {
	return StyleSheet.create({
		container: {
			flex: 1,
			padding: 16,
			backgroundColor: theme.background
		},
		center: {
			justifyContent: 'center',
			alignItems: 'center'
		},
		loadingText: {
			marginTop: 12,
			color: theme.textSecondary,
			fontSize: 14
		},
		title: {
			fontSize: 28,
			fontWeight: 'bold',
			marginBottom: 4,
			color: theme.text
		},
		subtitle: {
			fontSize: 14,
			color: theme.textSecondary,
			marginBottom: 20
		},
		summaryRow: {
			flexDirection: 'row',
			gap: 12,
			marginBottom: 16
		},
		summaryCard: {
			flex: 1,
			backgroundColor: theme.card,
			borderRadius: 16,
			padding: 16,
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: isDarkMode ? 0.3 : 0.1,
			shadowRadius: 4,
			elevation: 3
		},
		summaryCardPrimary: {
			backgroundColor: theme.primary
		},
		summaryLabel: {
			fontSize: 12,
			color: theme.textTertiary,
			marginBottom: 8,
			fontWeight: '500'
		},
		summaryValue: {
			fontSize: 24,
			fontWeight: 'bold',
			color: theme.text
		},
		summaryValueWhite: {
			color: '#fff'
		},
		summaryLabelWhite: {
			color: '#E0E0E0'
		},
		budgetOverviewCard: {
			backgroundColor: theme.card,
			borderRadius: 16,
			padding: 20,
			marginBottom: 16,
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: isDarkMode ? 0.3 : 0.1,
			shadowRadius: 8,
			elevation: 3,
			borderLeftWidth: 4,
			borderLeftColor: theme.primary
		},
		budgetOverviewHeader: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			marginBottom: 16
		},
		budgetOverviewTitle: {
			fontSize: 20,
			fontWeight: 'bold',
			color: theme.text
		},
	budgetOverviewPercent: {
		fontSize: 24,
		fontWeight: 'bold'
	},
	budgetOverviewAmounts: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
		flexWrap: 'wrap'
	},
	budgetAmountItem: {
		flex: 1,
		minWidth: '30%',
		alignItems: 'center',
		paddingVertical: 8
	},
	budgetAmountLabel: {
		fontSize: 12,
		color: theme.textSecondary,
		marginBottom: 4,
		fontWeight: '500'
	},
	budgetAmountValue: {
		fontSize: 18,
		fontWeight: 'bold',
		color: theme.text
	},
	budgetAmountRemaining: {
		color: '#34C759'
	},
	budgetAmountOver: {
		color: '#FF3B30'
	},
	budgetAmountDivider: {
		width: 1,
		height: 40,
		backgroundColor: theme.border,
		marginHorizontal: 8
	},
	budgetOverviewProgress: {
		marginBottom: 12
	},
	budgetOverviewProgressBar: {
		height: 12,
		backgroundColor: theme.border,
		borderRadius: 6,
		overflow: 'hidden'
	},
	budgetOverviewProgressFill: {
		height: '100%',
		borderRadius: 6
	},
	budgetWarning: {
		backgroundColor: isDarkMode ? '#4A3A00' : '#FFF3CD',
		borderRadius: 8,
		padding: 12,
		borderLeftWidth: 3,
		borderLeftColor: '#FF9500'
	},
	budgetWarningText: {
		fontSize: 14,
		color: isDarkMode ? '#FFD700' : '#856404',
		fontWeight: '500'
	},
	card: {
		backgroundColor: theme.card,
		borderRadius: 16,
		padding: 20,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: isDarkMode ? 0.3 : 0.1,
		shadowRadius: 8,
		elevation: 3
	},
	cardTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 16,
		color: theme.text
	},
	budgetItem: {
		marginBottom: 16
	},
	budgetHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8
	},
	budgetCategory: {
		fontSize: 16,
		fontWeight: '600',
		color: theme.text
	},
	budgetAmount: {
		fontSize: 12,
		color: theme.textSecondary,
		marginTop: 4
	},
	budgetPercent: {
		fontSize: 16,
		fontWeight: 'bold'
	},
	progressBar: {
		height: 10,
		backgroundColor: theme.border,
		borderRadius: 5,
		overflow: 'hidden',
		marginBottom: 4
	},
	progressFill: {
		height: '100%',
		borderRadius: 5
	},
	chartContainer: {
		alignItems: 'center',
		backgroundColor: isDarkMode ? theme.surface : '#fafafa',
		borderRadius: 12,
		padding: 12,
		marginBottom: 16
	},
	categoryItem: {
		marginBottom: 16
	},
	categoryHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8
	},
	categoryRank: {
		width: 36,
		height: 36,
		borderRadius: 18,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12
	},
	rankNumber: {
		color: '#fff',
		fontWeight: 'bold',
		fontSize: 16
	},
	categoryInfo: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center'
	},
	categoryInfoLeft: {
		flex: 1
	},
	categoryName: {
		fontSize: 16,
		fontWeight: '500',
		color: theme.text
	},
	categoryBudget: {
		fontSize: 12,
		color: theme.textSecondary,
		marginTop: 2
	},
	categoryAmount: {
		fontSize: 16,
		fontWeight: 'bold',
		color: theme.text
	},
	percentageBarContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginLeft: 48
	},
	percentageBar: {
		flex: 1,
		height: 8,
		backgroundColor: theme.border,
		borderRadius: 4,
		overflow: 'hidden',
		marginRight: 12
	},
	percentageBarFill: {
		height: '100%',
		borderRadius: 4
	},
	percentageTextContainer: {
		alignItems: 'flex-end',
		minWidth: 70
	},
	percentageText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#666'
	},
	percentageLabel: {
		fontSize: 10,
		color: theme.textTertiary,
		marginTop: 2
	},
	fallbackContainer: {
		padding: 8
	},
	fallbackText: {
		fontSize: 14,
		color: theme.textSecondary,
		marginBottom: 12,
		fontWeight: '500'
	},
	dataPoint: {
		marginBottom: 16
	},
	dataDate: {
		fontSize: 14,
		color: theme.textSecondary,
		fontWeight: '500',
		marginBottom: 6
	},
	dataValue: {
		fontSize: 16,
		fontWeight: '600',
		color: theme.text,
		marginBottom: 8
	},
	dataBarContainer: {
		height: 8,
		backgroundColor: theme.border,
		borderRadius: 4,
		overflow: 'hidden'
	},
	dataBar: {
		height: '100%',
		backgroundColor: theme.primary,
		borderRadius: 4
	},
	emptyContainer: {
		alignItems: 'center',
		paddingVertical: 60
	},
	emptyIcon: {
		fontSize: 64,
		marginBottom: 16
	},
	emptyText: {
		fontSize: 20,
		fontWeight: '600',
		color: theme.textSecondary,
		marginBottom: 8
	},
		emptySubtext: {
			fontSize: 14,
			color: theme.textTertiary,
			textAlign: 'center'
		}
	});
}
