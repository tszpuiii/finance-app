import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchExpenses } from '../services/expenses';
import { getBudgets } from '../services/budgets';
import { getCurrency, formatCurrencySync } from '../utils/currencySettings';
import ExpenseItem from '../components/ExpenseItem';
import { useTheme } from '../contexts/ThemeContext';

export default function CalendarViewScreen({ navigation }) {
	const { theme, isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const [expenses, setExpenses] = useState([]);
	const [selectedDate, setSelectedDate] = useState(null);
	const [currency, setCurrency] = useState('USD');
	const [currentMonth, setCurrentMonth] = useState(new Date());
	const [dailyTotals, setDailyTotals] = useState(new Map());
	const [budgets, setBudgets] = useState([]);
	const [dailyCategoryTotals, setDailyCategoryTotals] = useState(new Map());

	useEffect(() => {
		loadCurrency();
	}, []);

	async function loadCurrency() {
		const curr = await getCurrency();
		setCurrency(curr);
	}

	const loadExpenses = useCallback(async () => {
		try {
			const [items, budgetList] = await Promise.all([
				fetchExpenses().catch(() => []),
				getBudgets().catch(() => [])
			]);
			
			setExpenses(items);
			setBudgets(budgetList);
			
			// 按日期聚合支出
			const totals = new Map();
			const categoryTotals = new Map(); // Map<dateKey, Map<category, amount>>
			
			items.forEach(expense => {
				// 處理日期：確保使用本地時區的日期部分
				const date = new Date(expense.date);
				// 使用本地時區的年月日，避免時區轉換問題
				const year = date.getFullYear();
				const month = date.getMonth() + 1;
				const day = date.getDate();
				const dateKey = `${year}-${month}-${day}`;
				
				const currentTotal = totals.get(dateKey) || 0;
				totals.set(dateKey, currentTotal + Number(expense.amount || 0));
				
				// 按類別聚合
				const category = expense.category || 'Other';
				if (!categoryTotals.has(dateKey)) {
					categoryTotals.set(dateKey, new Map());
				}
				const dayCategories = categoryTotals.get(dateKey);
				const currentCategoryTotal = dayCategories.get(category) || 0;
				dayCategories.set(category, currentCategoryTotal + Number(expense.amount || 0));
			});
			
			setDailyTotals(totals);
			setDailyCategoryTotals(categoryTotals);
		} catch (error) {
			console.error('Failed to load expenses:', error);
		}
	}, []);

	useFocusEffect(
		useCallback(() => {
			loadExpenses();
		}, [loadExpenses])
	);

	// 獲取當月所有日期
	function getDaysInMonth(date) {
		const year = date.getFullYear();
		const month = date.getMonth();
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const daysInMonth = lastDay.getDate();
		const startingDayOfWeek = firstDay.getDay();
		
		const days = [];
		
		// 添加前一個月的日期（用於填充第一周）
		if (startingDayOfWeek > 0) {
			const prevMonthLastDay = new Date(year, month, 0); // 獲取上個月的最後一天
			const prevMonthDays = prevMonthLastDay.getDate();
			// 從上個月的最後一天開始往前填充
			for (let i = startingDayOfWeek - 1; i >= 0; i--) {
				const dayNumber = prevMonthDays - i;
				days.push({
					date: new Date(year, month - 1, dayNumber),
					isCurrentMonth: false,
				});
			}
		}
		
		// 添加當月的日期
		for (let i = 1; i <= daysInMonth; i++) {
			days.push({
				date: new Date(year, month, i),
				isCurrentMonth: true,
			});
		}
		
		// 添加下一個月的日期（用於填充最後一周）
		const remainingDays = 42 - days.length; // 6 周 x 7 天
		for (let i = 1; i <= remainingDays; i++) {
			days.push({
				date: new Date(year, month + 1, i),
				isCurrentMonth: false,
			});
		}
		
		return days;
	}

	function getDateKey(date) {
		return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
	}

	function getAmountForDate(date) {
		const key = getDateKey(date);
		return dailyTotals.get(key) || 0;
	}

	function getIntensityColor(amount, dateKey) {
		if (amount === 0) return isDarkMode ? theme.surface : '#f0f0f0';
		
		// 獲取該日期的類別支出
		const dayCategories = dailyCategoryTotals.get(dateKey);
		
		// 計算該日期所有類別相對於預算的最大比例
		let maxRatio = 0;
		const overallBudget = budgets.find(b => b.category === 'ALL' && b.period === 'monthly');
		
		// 如果有類別支出數據，嘗試基於預算計算
		if (dayCategories && dayCategories.size > 0) {
			dayCategories.forEach((categoryAmount, category) => {
				// 先查找該類別的預算
				const categoryBudget = budgets.find(b => b.category === category && b.period === 'monthly');
				const budget = categoryBudget?.limit || overallBudget?.limit;
				
				if (budget && budget > 0) {
					// 計算該類別當天的支出相對於月預算的比例
					// 假設平均每天可以使用 budget / daysInMonth
					const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
					const dailyBudget = budget / daysInMonth;
					const ratio = categoryAmount / dailyBudget;
					maxRatio = Math.max(maxRatio, ratio);
				} else if (overallBudget && overallBudget.limit > 0) {
					// 如果沒有類別預算，使用總預算
					const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
					const dailyBudget = overallBudget.limit / daysInMonth;
					const ratio = categoryAmount / dailyBudget;
					maxRatio = Math.max(maxRatio, ratio);
				}
			});
		}
		
		// 如果沒有找到任何預算比例，使用總支出作為參考（降級方案）
		if (maxRatio === 0) {
			// 優先使用總預算
			if (overallBudget && overallBudget.limit > 0) {
				const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
				const dailyBudget = overallBudget.limit / daysInMonth;
				maxRatio = amount / dailyBudget;
			} else {
				// 計算總支出相對於所有預算總和的比例
				const totalBudget = budgets
					.filter(b => b.period === 'monthly')
					.reduce((sum, b) => sum + (b.limit || 0), 0);
				
				if (totalBudget > 0) {
					const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
					const dailyBudget = totalBudget / daysInMonth;
					maxRatio = amount / dailyBudget;
				} else {
					// 如果完全沒有預算，使用當月最大支出作為參考（降級方案）
					const maxAmount = Math.max(...Array.from(dailyTotals.values()), 0);
					if (maxAmount > 0) {
						maxRatio = amount / maxAmount;
					} else {
						// 如果完全沒有支出數據，返回中性顏色
						return isDarkMode ? theme.surface : '#e3f2fd';
					}
				}
			}
		}
		
		// 根據比例返回顏色
		// 如果使用預算計算，使用預算比例標準
		// 如果使用最大支出計算，調整比例標準
		if (budgets.length > 0) {
			// 基於預算的比例
			if (maxRatio >= 2.0) return '#ff5252'; // 紅色 - 非常高支出（超過每日預算2倍）
			if (maxRatio >= 1.5) return '#ff6b35'; // 深橙色 - 高支出
			if (maxRatio >= 1.0) return '#ff9800'; // 橙色 - 中等支出（達到每日預算）
			if (maxRatio >= 0.5) return '#ffc107'; // 黃色 - 低支出
			return isDarkMode ? '#2d5016' : '#c8e6c9'; // 綠色 - 很低支出
		} else {
			// 基於最大支出的比例（降級方案）
			if (maxRatio >= 0.8) return '#ff5252'; // 紅色 - 高支出
			if (maxRatio >= 0.5) return '#ff9800'; // 橙色 - 中等支出
			if (maxRatio >= 0.3) return '#ffc107'; // 黃色 - 低支出
			return isDarkMode ? '#2d5016' : '#c8e6c9'; // 綠色 - 很低支出
		}
	}

	function changeMonth(direction) {
		setCurrentMonth(prev => {
			const newDate = new Date(prev);
			newDate.setMonth(prev.getMonth() + direction);
			return newDate;
		});
		setSelectedDate(null);
	}

	function handleDatePress(day) {
		if (!day.isCurrentMonth) return;
		setSelectedDate(day.date);
	}

	function getSelectedDateExpenses() {
		if (!selectedDate) return [];
		const key = getDateKey(selectedDate);
		return expenses.filter(expense => {
			const expenseDate = new Date(expense.date);
			const expenseKey = getDateKey(expenseDate);
			return expenseKey === key;
		});
	}

	const days = getDaysInMonth(currentMonth);
	const selectedExpenses = getSelectedDateExpenses();
	const selectedDateTotal = selectedExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

	const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
		'July', 'August', 'September', 'October', 'November', 'December'];
	const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	const styles = getStyles(theme, isDarkMode);

	return (
		<ScrollView 
			style={styles.container}
			contentContainerStyle={{ paddingTop: insets.top }}
		>
			{/* 月份導航 */}
			<View style={styles.monthHeader}>
				<TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthButton}>
					<Text style={styles.monthButtonText}>‹</Text>
				</TouchableOpacity>
				<Text style={styles.monthTitle}>
					{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
				</Text>
				<TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthButton}>
					<Text style={styles.monthButtonText}>›</Text>
				</TouchableOpacity>
			</View>

			{/* 星期標題 */}
			<View style={styles.weekDaysContainer}>
				{weekDays.map(day => (
					<View key={day} style={styles.weekDay}>
						<Text style={styles.weekDayText}>{day}</Text>
					</View>
				))}
			</View>

			{/* 日曆網格 */}
			<View style={styles.calendarGrid}>
				{days.map((day, index) => {
					const amount = getAmountForDate(day.date);
					const isToday = getDateKey(day.date) === getDateKey(new Date());
					const isSelected = selectedDate && getDateKey(day.date) === getDateKey(selectedDate);
					
					return (
						<TouchableOpacity
							key={index}
							style={[
								styles.calendarDay,
								!day.isCurrentMonth && styles.calendarDayOtherMonth,
								isToday && styles.calendarDayToday,
								isSelected && styles.calendarDaySelected,
							]}
							onPress={() => handleDatePress(day)}
							disabled={!day.isCurrentMonth}
						>
							<View
								style={[
									styles.amountIndicator,
									{ backgroundColor: getIntensityColor(amount, getDateKey(day.date)) },
									amount > 0 && styles.amountIndicatorActive,
								]}
							>
								<Text style={[
									styles.dayNumber,
									!day.isCurrentMonth && styles.dayNumberOtherMonth,
									isToday && styles.dayNumberToday,
								]}>
									{day.date.getDate()}
								</Text>
								{amount > 0 && (
									<Text style={styles.amountText} numberOfLines={1}>
										{formatCurrencySync(amount, currency, true)}
									</Text>
								)}
							</View>
						</TouchableOpacity>
					);
				})}
			</View>

			{/* 選中日期的詳細信息 */}
			{selectedDate && (
				<View style={styles.selectedDateContainer}>
					<View style={styles.selectedDateHeader}>
						<Text style={styles.selectedDateTitle}>
							{selectedDate.toLocaleDateString('en-US', { 
								weekday: 'long', 
								year: 'numeric', 
								month: 'long', 
								day: 'numeric' 
							})}
						</Text>
						<Text style={styles.selectedDateTotal}>
							Total: {formatCurrencySync(selectedDateTotal, currency)}
						</Text>
					</View>
					
					{selectedExpenses.length > 0 ? (
						<FlatList
							data={selectedExpenses}
							keyExtractor={(item) => item._id}
							renderItem={({ item }) => (
								<ExpenseItem 
									expense={item} 
									navigation={navigation}
								/>
							)}
							scrollEnabled={false}
						/>
					) : (
						<Text style={styles.noExpensesText}>No expenses on this day</Text>
					)}
				</View>
			)}

			{/* 圖例 */}
			<View style={styles.legend}>
				<Text style={styles.legendTitle}>Spending Intensity</Text>
				<View style={styles.legendItems}>
					<View style={styles.legendItem}>
						<View style={[styles.legendColor, { backgroundColor: '#c8e6c9' }]} />
						<Text style={styles.legendText}>Low</Text>
					</View>
					<View style={styles.legendItem}>
						<View style={[styles.legendColor, { backgroundColor: '#ffc107' }]} />
						<Text style={styles.legendText}>Medium</Text>
					</View>
					<View style={styles.legendItem}>
						<View style={[styles.legendColor, { backgroundColor: '#ff9800' }]} />
						<Text style={styles.legendText}>High</Text>
					</View>
					<View style={styles.legendItem}>
						<View style={[styles.legendColor, { backgroundColor: '#ff5252' }]} />
						<Text style={styles.legendText}>Very High</Text>
					</View>
				</View>
			</View>
		</ScrollView>
	);
}

function getStyles(theme, isDarkMode) {
	return StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.background,
		},
		monthHeader: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			padding: 20,
			backgroundColor: theme.card,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		monthButton: {
			padding: 10,
		},
		monthButtonText: {
			fontSize: 24,
			color: theme.primary,
			fontWeight: 'bold',
		},
		monthTitle: {
			fontSize: 20,
			fontWeight: 'bold',
			color: theme.text,
		},
		weekDaysContainer: {
			flexDirection: 'row',
			backgroundColor: theme.card,
			paddingVertical: 10,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		weekDay: {
			flex: 1,
			alignItems: 'center',
		},
		weekDayText: {
			fontSize: 12,
			fontWeight: '600',
			color: theme.textSecondary,
		},
		calendarGrid: {
			flexDirection: 'row',
			flexWrap: 'wrap',
			backgroundColor: theme.card,
			padding: 8,
		},
		calendarDay: {
			width: '14.28%',
			aspectRatio: 1,
			padding: 4,
		},
		calendarDayOtherMonth: {
			opacity: 0.3,
		},
		calendarDayToday: {
			borderWidth: 2,
			borderColor: theme.primary,
			borderRadius: 8,
		},
		calendarDaySelected: {
			borderWidth: 2,
			borderColor: theme.primary,
			borderRadius: 8,
			backgroundColor: theme.primary + '20',
		},
		amountIndicator: {
			flex: 1,
			borderRadius: 6,
			justifyContent: 'center',
			alignItems: 'center',
			padding: 4,
		},
		amountIndicatorActive: {
			borderWidth: 1,
			borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
		},
		dayNumber: {
			fontSize: 12,
			fontWeight: '600',
			color: theme.text,
			marginBottom: 2,
		},
		dayNumberOtherMonth: {
			color: theme.textTertiary,
		},
		dayNumberToday: {
			color: theme.primary,
			fontWeight: 'bold',
		},
		amountText: {
			fontSize: 9,
			fontWeight: '600',
			color: isDarkMode ? '#fff' : '#333',
			textAlign: 'center',
			textShadowColor: isDarkMode ? 'rgba(0,0,0,0.5)' : 'transparent',
			textShadowOffset: { width: 0, height: 1 },
			textShadowRadius: 2,
		},
		selectedDateContainer: {
			backgroundColor: theme.card,
			margin: 16,
			padding: 16,
			borderRadius: 12,
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: isDarkMode ? 0.3 : 0.1,
			shadowRadius: 4,
			elevation: 3,
		},
		selectedDateHeader: {
			marginBottom: 16,
			paddingBottom: 12,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		selectedDateTitle: {
			fontSize: 18,
			fontWeight: 'bold',
			color: theme.text,
			marginBottom: 8,
		},
		selectedDateTotal: {
			fontSize: 16,
			fontWeight: '600',
			color: theme.primary,
		},
		noExpensesText: {
			textAlign: 'center',
			color: theme.textTertiary,
			fontStyle: 'italic',
			padding: 20,
		},
		legend: {
			backgroundColor: theme.card,
			margin: 16,
			padding: 16,
			borderRadius: 12,
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: isDarkMode ? 0.3 : 0.1,
			shadowRadius: 4,
			elevation: 3,
			marginBottom: 40,
		},
		legendTitle: {
			fontSize: 14,
			fontWeight: '600',
			color: theme.text,
			marginBottom: 12,
		},
		legendItems: {
			flexDirection: 'row',
			justifyContent: 'space-around',
		},
		legendItem: {
			alignItems: 'center',
		},
		legendColor: {
			width: 30,
			height: 30,
			borderRadius: 6,
			marginBottom: 4,
			borderWidth: 1,
			borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
		},
		legendText: {
			fontSize: 10,
			color: theme.textSecondary,
		},
	});
}


