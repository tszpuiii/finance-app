import { useCallback, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl, TextInput, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchExpenses, deleteExpense } from '../services/expenses';
import { syncPendingExpenses } from '../utils/sync';
import { getBudgetStatus } from '../services/budgets';
import ExpenseItem from '../components/ExpenseItem';
import BudgetChart from '../components/BudgetChart';
import { getCurrency, formatCurrencySync } from '../utils/currencySettings';
import { useTheme } from '../contexts/ThemeContext';

export default function DashboardScreen({ navigation }) {
	const { theme, isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const [expenses, setExpenses] = useState([]);
	const [refreshing, setRefreshing] = useState(false);
	const [query, setQuery] = useState('');
	const [currency, setCurrency] = useState('USD');
	const [totalSpent, setTotalSpent] = useState(0);
	const [monthSpent, setMonthSpent] = useState(0);
	const [budgetStatus, setBudgetStatus] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadCurrency();
	}, []);

	async function loadCurrency() {
		const curr = await getCurrency();
		setCurrency(curr);
	}

	const load = useCallback(async () => {
		setRefreshing(true);
		try {
			const [items, budgets] = await Promise.all([
				fetchExpenses().catch(() => []),
				getBudgetStatus().catch(() => [])
			]);
			
			setExpenses(items);
			setBudgetStatus(budgets || []);

			// 計算總支出
			const total = items.reduce((sum, e) => sum + Number(e.amount || 0), 0);
			setTotalSpent(total);

			// 計算本月支出
			const now = new Date();
			const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
			const monthExpenses = items.filter(e => {
				const expenseDate = new Date(e.date);
				return expenseDate >= monthStart;
			});
			const monthTotal = monthExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
			setMonthSpent(monthTotal);
		} catch (error) {
			console.error('Load error:', error);
		} finally {
			setRefreshing(false);
			setLoading(false);
		}
	}, []);

	useFocusEffect(
		useCallback(() => {
			(async () => {
				try {
					const synced = await syncPendingExpenses();
					if (synced > 0) {
						console.log(`Synced ${synced} pending expenses`);
					}
				} catch (error) {
					console.error('Sync error:', error);
				}
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
		return (e.category || '').toLowerCase().includes(q) || 
		       (e.note || '').toLowerCase().includes(q) ||
		       formatCurrencySync(e.amount, currency).toLowerCase().includes(q);
	});

	async function onDelete(item) {
		Alert.alert(
			'Delete Expense',
			`Are you sure you want to delete ${formatCurrencySync(item.amount, currency)} expense?`,
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete',
					style: 'destructive',
					onPress: async () => {
						try {
							await deleteExpense(item._id);
							setExpenses((prev) => prev.filter((x) => x._id !== item._id));
							// 重新計算統計
							const updated = expenses.filter((x) => x._id !== item._id);
							const total = updated.reduce((sum, e) => sum + Number(e.amount || 0), 0);
							setTotalSpent(total);
						} catch {
							Alert.alert('Delete Failed', 'Please try again');
						}
					}
				}
			]
		);
	}

	// 獲取總預算狀態
	const totalBudget = budgetStatus.find(b => b.category === 'ALL');
	const budgetRatio = totalBudget && totalBudget.limit > 0 ? totalBudget.spent / totalBudget.limit : 0;
	const budgetPercent = Math.min(100, Math.round(budgetRatio * 100));

	// 獲取進度條顏色
	function getProgressColor(ratio) {
		if (ratio >= 1) return '#FF3B30';
		if (ratio >= 0.8) return '#FF9500';
		return '#34C759';
	}

	const styles = getStyles(theme, isDarkMode);

	if (loading) {
		return (
			<View style={[styles.container, styles.center]}>
				<ActivityIndicator size="large" color={theme.primary} />
				<Text style={styles.loadingText}>Loading...</Text>
			</View>
		);
	}

	return (
		<View style={[styles.container, { paddingTop: insets.top }]}>
			<ScrollView 
				style={styles.scrollView}
				showsVerticalScrollIndicator={false}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
			>
				{/* Header */}
				<View style={styles.header}>
					<Text style={styles.title}>🏠 Dashboard</Text>
					<Text style={styles.subtitle}>Your financial overview</Text>
				</View>

				{/* Summary Cards */}
				<View style={styles.summaryRow}>
					<View style={[styles.summaryCard, styles.summaryCardPrimary]}>
						<Text style={[styles.summaryLabel, styles.summaryLabelPrimary]}>Total Spent</Text>
						<Text style={[styles.summaryValue, styles.summaryValuePrimary]}>{formatCurrencySync(totalSpent, currency)}</Text>
					</View>
					<View style={styles.summaryCard}>
						<Text style={styles.summaryLabel}>This Month</Text>
						<Text style={styles.summaryValue}>{formatCurrencySync(monthSpent, currency)}</Text>
					</View>
				</View>

				{/* Budget Overview (if budget is set) */}
				{totalBudget && totalBudget.limit > 0 && (
					<View style={styles.budgetCard}>
						<View style={styles.budgetHeader}>
							<Text style={styles.budgetTitle}>💰 Budget Overview</Text>
							<Text style={[styles.budgetPercent, { color: getProgressColor(budgetRatio) }]}>
								{budgetPercent}%
							</Text>
						</View>
						<View style={styles.budgetProgressBar}>
							<View
								style={[
									styles.budgetProgressFill,
									{
										width: `${budgetPercent}%`,
										backgroundColor: getProgressColor(budgetRatio)
									}
								]}
							/>
						</View>
						<View style={styles.budgetAmounts}>
							<Text style={styles.budgetAmount}>
								{formatCurrencySync(totalBudget.spent, currency)} / {formatCurrencySync(totalBudget.limit, currency)}
							</Text>
							{totalBudget.spent < totalBudget.limit && (
								<Text style={styles.budgetRemaining}>
									Remaining: {formatCurrencySync(totalBudget.limit - totalBudget.spent, currency)}
								</Text>
							)}
						</View>
						{budgetRatio >= 1 && (
							<View style={styles.budgetWarning}>
								<Text style={styles.budgetWarningText}>⚠️ Budget exceeded!</Text>
							</View>
						)}
						{budgetRatio >= 0.8 && budgetRatio < 1 && (
							<View style={styles.budgetWarning}>
								<Text style={styles.budgetWarningText}>⚠️ Approaching budget limit</Text>
							</View>
						)}
					</View>
				)}

				{/* Category Chart */}
				{categoryTotals.length > 0 && (
					<View style={styles.chartCard}>
						<Text style={styles.cardTitle}>📊 Expense by Category</Text>
						<BudgetChart data={categoryTotals} />
					</View>
				)}

				{/* Quick Actions */}
				<View style={styles.quickActions}>
					<TouchableOpacity 
						style={[styles.quickActionButton, styles.primaryActionButton]} 
						onPress={() => navigation.navigate('AddExpense')}
					>
						<Text style={styles.quickActionIcon}>➕</Text>
						<Text style={[styles.quickActionText, styles.primaryActionText]}>Add Expense</Text>
					</TouchableOpacity>
					<TouchableOpacity 
						style={styles.quickActionButton} 
						onPress={() => navigation.navigate('CurrencySettings')}
					>
						<Text style={styles.quickActionIcon}>💱</Text>
						<Text style={styles.quickActionText}>Currency</Text>
					</TouchableOpacity>
					<TouchableOpacity 
						style={styles.quickActionButton} 
						onPress={() => navigation.navigate('Budget')}
					>
						<Text style={styles.quickActionIcon}>💰</Text>
						<Text style={styles.quickActionText}>Budget</Text>
					</TouchableOpacity>
				</View>

				{/* Search */}
				<View style={styles.searchContainer}>
					<TextInput
						placeholder="🔍 Search expenses..."
						placeholderTextColor={theme.textTertiary}
						value={query}
						onChangeText={setQuery}
						style={styles.searchInput}
					/>
					{query.length > 0 && (
						<TouchableOpacity 
							style={styles.clearButton}
							onPress={() => setQuery('')}
						>
							<Text style={styles.clearButtonText}>✕</Text>
						</TouchableOpacity>
					)}
				</View>

				{/* Recent Expenses Header */}
				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>Recent Expenses</Text>
					{filtered.length > 0 && (
						<Text style={styles.sectionCount}>{filtered.length} {filtered.length === 1 ? 'expense' : 'expenses'}</Text>
					)}
				</View>

				{/* Expenses List */}
				{filtered.length === 0 ? (
					<View style={styles.emptyContainer}>
						<Text style={styles.emptyIcon}>📝</Text>
						<Text style={styles.emptyText}>
							{query ? 'No expenses found' : 'No expenses yet'}
						</Text>
						<Text style={styles.emptySubtext}>
							{query ? 'Try a different search term' : 'Add your first expense to get started!'}
						</Text>
						{!query && (
							<TouchableOpacity 
								style={styles.emptyButton}
								onPress={() => navigation.navigate('AddExpense')}
							>
								<Text style={styles.emptyButtonText}>➕ Add Expense</Text>
							</TouchableOpacity>
						)}
					</View>
				) : (
					<View style={styles.expensesList}>
						{filtered.map((item) => (
							<ExpenseItem 
								key={item._id} 
								expense={item} 
								onDelete={onDelete} 
								navigation={navigation} 
							/>
						))}
					</View>
				)}
			</ScrollView>
		</View>
	);
}

function getStyles(theme, isDarkMode) {
	return StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.background,
		},
		center: {
			justifyContent: 'center',
			alignItems: 'center',
		},
		loadingText: {
			marginTop: 12,
			fontSize: 16,
			color: theme.textSecondary,
		},
		scrollView: {
			flex: 1,
		},
		header: {
			padding: 16,
			paddingBottom: 8,
		},
		title: {
			fontSize: 28,
			fontWeight: 'bold',
			marginBottom: 4,
			color: theme.text,
		},
		subtitle: {
			fontSize: 14,
			color: theme.textSecondary,
		},
		summaryRow: {
			flexDirection: 'row',
			gap: 12,
			paddingHorizontal: 16,
			marginBottom: 16,
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
			elevation: 3,
		},
		summaryCardPrimary: {
			backgroundColor: theme.primary,
		},
		summaryLabel: {
			fontSize: 12,
			color: theme.textSecondary,
			marginBottom: 8,
			fontWeight: '500',
		},
		summaryValue: {
			fontSize: 24,
			fontWeight: 'bold',
			color: theme.text,
		},
		summaryLabelPrimary: {
			color: '#E0E0E0',
		},
		summaryValuePrimary: {
			color: '#fff',
		},
		budgetCard: {
			backgroundColor: theme.card,
			borderRadius: 16,
			padding: 20,
			marginHorizontal: 16,
			marginBottom: 16,
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: isDarkMode ? 0.3 : 0.1,
			shadowRadius: 8,
			elevation: 3,
			borderLeftWidth: 4,
			borderLeftColor: theme.primary,
		},
		budgetHeader: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			marginBottom: 12,
		},
		budgetTitle: {
			fontSize: 18,
			fontWeight: 'bold',
			color: theme.text,
		},
		budgetPercent: {
			fontSize: 20,
			fontWeight: 'bold',
		},
		budgetProgressBar: {
			height: 10,
			backgroundColor: theme.border,
			borderRadius: 5,
			overflow: 'hidden',
			marginBottom: 12,
		},
		budgetProgressFill: {
			height: '100%',
			borderRadius: 5,
		},
		budgetAmounts: {
			marginBottom: 8,
		},
		budgetAmount: {
			fontSize: 16,
			fontWeight: '600',
			color: theme.text,
			marginBottom: 4,
		},
		budgetRemaining: {
			fontSize: 14,
			color: '#34C759',
			fontWeight: '500',
		},
		budgetWarning: {
			backgroundColor: isDarkMode ? '#4A3A00' : '#FFF3CD',
			borderRadius: 8,
			padding: 12,
			marginTop: 8,
			borderLeftWidth: 3,
			borderLeftColor: '#FF9500',
		},
		budgetWarningText: {
			fontSize: 14,
			color: isDarkMode ? '#FFD700' : '#856404',
			fontWeight: '500',
		},
		chartCard: {
			backgroundColor: theme.card,
			borderRadius: 16,
			padding: 20,
			marginHorizontal: 16,
			marginBottom: 16,
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: isDarkMode ? 0.3 : 0.1,
			shadowRadius: 8,
			elevation: 3,
		},
		cardTitle: {
			fontSize: 18,
			fontWeight: 'bold',
			marginBottom: 16,
			color: theme.text,
		},
		quickActions: {
			flexDirection: 'row',
			gap: 12,
			paddingHorizontal: 16,
			marginBottom: 16,
		},
		quickActionButton: {
			flex: 1,
			backgroundColor: theme.card,
			borderRadius: 12,
			padding: 16,
			alignItems: 'center',
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 1 },
			shadowOpacity: isDarkMode ? 0.3 : 0.1,
			shadowRadius: 2,
			elevation: 2,
		},
		primaryActionButton: {
			backgroundColor: theme.primary,
		},
		quickActionIcon: {
			fontSize: 24,
			marginBottom: 8,
		},
		quickActionText: {
			fontSize: 12,
			fontWeight: '600',
			color: theme.text,
		},
		primaryActionText: {
			color: '#fff',
		},
		searchContainer: {
			flexDirection: 'row',
			alignItems: 'center',
			paddingHorizontal: 16,
			marginBottom: 16,
		},
		searchInput: {
			flex: 1,
			backgroundColor: theme.card,
			borderWidth: 1,
			borderColor: theme.border,
			borderRadius: 12,
			padding: 12,
			paddingRight: 40,
			fontSize: 14,
			color: theme.text,
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 1 },
			shadowOpacity: isDarkMode ? 0.2 : 0.05,
			shadowRadius: 2,
			elevation: 1,
		},
		clearButton: {
			position: 'absolute',
			right: 24,
			padding: 8,
		},
		clearButtonText: {
			fontSize: 18,
			color: theme.textTertiary,
			fontWeight: 'bold',
		},
		sectionHeader: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			paddingHorizontal: 16,
			marginBottom: 12,
		},
		sectionTitle: {
			fontSize: 20,
			fontWeight: 'bold',
			color: theme.text,
		},
		sectionCount: {
			fontSize: 14,
			color: theme.textSecondary,
			fontWeight: '500',
		},
		expensesList: {
			paddingHorizontal: 16,
			paddingBottom: 20,
		},
		emptyContainer: {
			alignItems: 'center',
			justifyContent: 'center',
			padding: 60,
			marginHorizontal: 16,
		},
		emptyIcon: {
			fontSize: 64,
			marginBottom: 16,
		},
		emptyText: {
			fontSize: 20,
			fontWeight: '600',
			color: theme.text,
			marginBottom: 8,
			textAlign: 'center',
		},
		emptySubtext: {
			fontSize: 14,
			color: theme.textSecondary,
			textAlign: 'center',
			marginBottom: 24,
		},
		emptyButton: {
			backgroundColor: theme.primary,
			paddingHorizontal: 24,
			paddingVertical: 12,
			borderRadius: 12,
		},
		emptyButtonText: {
			color: '#fff',
			fontSize: 16,
			fontWeight: '600',
		},
	});
}
