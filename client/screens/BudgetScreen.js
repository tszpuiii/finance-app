import { useCallback, useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView, TouchableOpacity, Modal, FlatList, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getBudgets, upsertBudget, getBudgetStatus, deleteBudget } from '../services/budgets';
import { getCurrency, formatCurrencySync, getCurrencySymbol } from '../utils/currencySettings';

// 常用類別列表
const COMMON_CATEGORIES = [
	'Food', 'Transport', 'Shopping', 'Entertainment', 
	'Bills', 'Healthcare', 'Education', 'Travel', 'Other'
];

export default function BudgetScreen() {
	const [overall, setOverall] = useState('');
	const [customCategories, setCustomCategories] = useState([]); // [{ category: string, limit: string, _id?: string }]
	const [newCategoryName, setNewCategoryName] = useState('');
	const [newCategoryLimit, setNewCategoryLimit] = useState('');
	const [status, setStatus] = useState([]);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [currency, setCurrency] = useState('USD');
	const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
	const [editingCategory, setEditingCategory] = useState(null);

	useEffect(() => {
		loadCurrency();
	}, []);

	async function loadCurrency() {
		const curr = await getCurrency();
		setCurrency(curr);
	}

	const load = useCallback(async () => {
		try {
			setLoading(true);
			const [budgets, s] = await Promise.all([getBudgets(), getBudgetStatus()]);
			
			setStatus(s || []);
			
			// Filter out old Chinese categories and ALL
			const oldCategories = ['交通', '飲食'];
			const validBudgets = budgets.filter(b => 
				b.period === 'monthly' && 
				!oldCategories.includes(b.category) && 
				b.category !== 'ALL'
			);
			
			// Set overall budget
			const allBudget = budgets.find(b => b.category === 'ALL' && b.period === 'monthly');
			setOverall(allBudget?.limit?.toString() || '');
			
			// Set custom categories with _id for tracking
			setCustomCategories(validBudgets.map(b => ({
				category: b.category,
				limit: b.limit?.toString() || '',
				_id: b._id
			})));
		} catch (err) {
			console.error('Failed to load budget data:', err);
			Alert.alert('Load Failed', err.message || 'Failed to load budget data');
		} finally {
			setLoading(false);
		}
	}, []);

	// 當頁面獲得焦點時自動刷新
	useFocusEffect(
		useCallback(() => {
			load();
		}, [load])
	);

	// 自動保存單個預算
	async function autoSaveBudget(category, limit) {
		if (!limit || isNaN(Number(limit)) || Number(limit) <= 0) {
			return; // 不保存無效值
		}
		try {
			await upsertBudget({ category, limit: Number(limit) });
			// 刷新狀態
			const s = await getBudgetStatus();
			setStatus(s || []);
		} catch (err) {
			console.error('Auto-save failed:', err);
		}
	}

	// 保存所有預算
	async function saveAll() {
		try {
			setSaving(true);
			const ops = [];
			
			// Save overall budget
			if (overall && !isNaN(Number(overall)) && Number(overall) > 0) {
				ops.push(upsertBudget({ category: 'ALL', limit: Number(overall) }));
			}
			
			// Save custom categories
			for (const cat of customCategories) {
				if (cat.limit && !isNaN(Number(cat.limit)) && Number(cat.limit) > 0) {
					ops.push(upsertBudget({ category: cat.category, limit: Number(cat.limit) }));
				}
			}
			
			await Promise.all(ops);
			await load();
			Alert.alert('Success', 'All budgets saved successfully');
		} catch (err) {
			console.error('Save budget error:', err);
			Alert.alert('Save Failed', err.message || 'Please try again');
		} finally {
			setSaving(false);
		}
	}

	// 添加新類別
	async function addCategory(categoryName = null) {
		const name = categoryName || newCategoryName.trim();
		const limit = newCategoryLimit.trim();

		if (!name) {
			Alert.alert('Error', 'Please enter a category name');
			return;
		}
		if (!limit || isNaN(Number(limit)) || Number(limit) <= 0) {
			Alert.alert('Error', 'Please enter a valid budget limit');
			return;
		}
		
		// Check if category already exists
		if (customCategories.some(c => c.category.toLowerCase() === name.toLowerCase())) {
			Alert.alert('Error', 'Category already exists');
			return;
		}
		
		// Don't allow ALL as custom category
		if (name.toUpperCase() === 'ALL') {
			Alert.alert('Error', 'ALL is reserved for total budget');
			return;
		}
		
		const newCat = {
			category: name,
			limit: limit
		};
		
		setCustomCategories([...customCategories, newCat]);
		setNewCategoryName('');
		setNewCategoryLimit('');
		setShowAddCategoryModal(false);
		
		// 自動保存新類別
		try {
			await upsertBudget({ category: name, limit: Number(limit) });
			await load();
		} catch (err) {
			Alert.alert('Error', 'Failed to save category');
		}
	}

	// 從常用類別快速添加
	function quickAddCategory(categoryName) {
		setNewCategoryName(categoryName);
		setShowAddCategoryModal(true);
	}

	// 移除類別
	async function removeCategory(categoryToRemove) {
		Alert.alert(
			'Remove Category',
			`Are you sure you want to remove "${categoryToRemove}"? This will also remove its budget limit.`,
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Remove',
					style: 'destructive',
					onPress: async () => {
						try {
							await deleteBudget(categoryToRemove);
							setCustomCategories(prev => prev.filter(c => c.category !== categoryToRemove));
							await load();
							Alert.alert('Success', 'Category removed successfully');
						} catch (err) {
							console.error('Remove category error:', err);
							const errorMsg = err.response?.data?.error || err.message || 'Failed to remove category';
							Alert.alert('Remove Failed', errorMsg);
						}
					}
				}
			]
		);
	}

	// 更新類別預算限制
	function updateCategoryLimit(category, newLimit) {
		setCustomCategories(prev => prev.map(c => 
			c.category === category ? { ...c, limit: newLimit } : c
		));
		
		// 自動保存（延遲執行以避免頻繁請求）
		const timeoutId = setTimeout(() => {
			autoSaveBudget(category, newLimit);
		}, 1000);
		
		return () => clearTimeout(timeoutId);
	}

	// 更新總預算
	function updateOverall(newValue) {
		setOverall(newValue);
		// 自動保存總預算
		if (newValue && !isNaN(Number(newValue)) && Number(newValue) > 0) {
			const timeoutId = setTimeout(() => {
				autoSaveBudget('ALL', newValue);
			}, 1000);
			return () => clearTimeout(timeoutId);
		}
	}

	// 獲取預算狀態
	function getBudgetStatusForCategory(category) {
		return status.find(s => s.category === category);
	}

	// 獲取進度條顏色
	function getProgressColor(ratio) {
		if (ratio >= 1) return '#FF3B30'; // 超過預算 - 紅色
		if (ratio >= 0.8) return '#FF9500'; // 接近預算 - 橙色
		return '#34C759'; // 正常 - 綠色
	}

	if (loading) {
		return (
			<View style={[styles.container, styles.center]}>
				<ActivityIndicator size="large" color="#007AFF" />
				<Text style={styles.loadingText}>Loading budgets...</Text>
			</View>
		);
	}

	return (
		<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
			<Text style={styles.title}>💰 Budget Settings</Text>
			<Text style={styles.subtitle}>Manage your monthly budget limits</Text>
			
			{/* Total Budget Card */}
			<View style={styles.card}>
				<View style={styles.cardHeader}>
					<Text style={styles.cardTitle}>Total Budget</Text>
					<Text style={styles.cardSubtitle}>Overall monthly limit</Text>
				</View>
				<View style={styles.inputContainer}>
					<Text style={styles.currencySymbol}>{getCurrencySymbol(currency)}</Text>
					<TextInput 
						style={styles.amountInput} 
						placeholder="0" 
						keyboardType="numeric" 
						value={overall} 
						onChangeText={updateOverall}
					/>
				</View>
				{getBudgetStatusForCategory('ALL') && (
					<View style={styles.progressContainer}>
						<View style={styles.progressBar}>
							<View 
								style={[
									styles.progressFill, 
									{ 
										width: `${Math.min(getBudgetStatusForCategory('ALL').ratio * 100, 100)}%`,
										backgroundColor: getProgressColor(getBudgetStatusForCategory('ALL').ratio)
									}
								]} 
							/>
						</View>
						<Text style={styles.progressText}>
							{formatCurrencySync(getBudgetStatusForCategory('ALL').spent, currency)} / {formatCurrencySync(getBudgetStatusForCategory('ALL').limit, currency)} ({Math.round(getBudgetStatusForCategory('ALL').ratio * 100)}%)
						</Text>
					</View>
				)}
			</View>

			{/* Categories Section */}
			<View style={styles.section}>
				<View style={styles.sectionHeader}>
					<Text style={styles.sectionTitle}>Categories</Text>
					<TouchableOpacity 
						style={styles.addButton}
						onPress={() => setShowAddCategoryModal(true)}
					>
						<Text style={styles.addButtonText}>+ Add</Text>
					</TouchableOpacity>
				</View>

				{/* Quick Add Common Categories */}
				<View style={styles.quickAddContainer}>
					<Text style={styles.quickAddLabel}>Quick Add:</Text>
					<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickAddScroll}>
						{COMMON_CATEGORIES
							.filter(cat => !customCategories.some(c => c.category.toLowerCase() === cat.toLowerCase()))
							.map((cat) => (
								<TouchableOpacity
									key={cat}
									style={styles.quickAddChip}
									onPress={() => quickAddCategory(cat)}
								>
									<Text style={styles.quickAddChipText}>{cat}</Text>
								</TouchableOpacity>
							))}
					</ScrollView>
				</View>

				{/* Category List */}
				{customCategories.length === 0 ? (
					<View style={styles.emptyState}>
						<Text style={styles.emptyText}>No categories yet</Text>
						<Text style={styles.emptySubtext}>Add categories to track spending by type</Text>
					</View>
				) : (
					customCategories.map((cat) => {
						const budgetStatus = getBudgetStatusForCategory(cat.category);
						return (
							<View key={cat.category} style={styles.categoryCard}>
								<View style={styles.categoryHeader}>
									<Text style={styles.categoryName}>{cat.category}</Text>
									<TouchableOpacity
										style={styles.removeIcon}
										onPress={() => removeCategory(cat.category)}
									>
										<Text style={styles.removeIconText}>🗑️</Text>
									</TouchableOpacity>
								</View>
								<View style={styles.inputContainer}>
									<Text style={styles.currencySymbol}>{getCurrencySymbol(currency)}</Text>
									<TextInput
										style={styles.amountInput}
										placeholder="0"
										keyboardType="numeric"
										value={cat.limit}
										onChangeText={(text) => updateCategoryLimit(cat.category, text)}
									/>
								</View>
								{budgetStatus && (
									<View style={styles.progressContainer}>
										<View style={styles.progressBar}>
											<View 
												style={[
													styles.progressFill, 
													{ 
														width: `${Math.min(budgetStatus.ratio * 100, 100)}%`,
														backgroundColor: getProgressColor(budgetStatus.ratio)
													}
												]} 
											/>
										</View>
										<Text style={styles.progressText}>
											{formatCurrencySync(budgetStatus.spent, currency)} / {formatCurrencySync(budgetStatus.limit, currency)} ({Math.round(budgetStatus.ratio * 100)}%)
										</Text>
										{budgetStatus.ratio >= 1 && (
											<Text style={styles.warningText}>⚠️ Budget exceeded!</Text>
										)}
										{budgetStatus.ratio >= 0.8 && budgetStatus.ratio < 1 && (
											<Text style={styles.warningText}>⚠️ Approaching limit</Text>
										)}
									</View>
								)}
							</View>
						);
					})
				)}
			</View>

			{/* Save All Button */}
			<TouchableOpacity 
				style={[styles.saveAllButton, saving && styles.saveAllButtonDisabled]} 
				onPress={saveAll} 
				disabled={saving}
			>
				{saving ? (
					<ActivityIndicator color="#fff" />
				) : (
					<Text style={styles.saveAllButtonText}>💾 Save All Budgets</Text>
				)}
			</TouchableOpacity>

			{/* Add Category Modal */}
			<Modal
				visible={showAddCategoryModal}
				transparent={true}
				animationType="slide"
				onRequestClose={() => setShowAddCategoryModal(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>Add New Category</Text>
						
						<Text style={styles.modalLabel}>Category Name</Text>
						<TextInput
							style={styles.modalInput}
							placeholder="e.g., Shopping, Entertainment"
							value={newCategoryName}
							onChangeText={setNewCategoryName}
							autoCapitalize="words"
						/>
						
						<Text style={styles.modalLabel}>Budget Limit</Text>
						<View style={styles.inputContainer}>
							<Text style={styles.currencySymbol}>{getCurrencySymbol(currency)}</Text>
							<TextInput
								style={[styles.modalInput, styles.amountInput]}
								placeholder="0"
								keyboardType="numeric"
								value={newCategoryLimit}
								onChangeText={setNewCategoryLimit}
							/>
						</View>

						<View style={styles.modalButtons}>
							<TouchableOpacity
								style={[styles.modalButton, styles.modalButtonCancel]}
								onPress={() => {
									setShowAddCategoryModal(false);
									setNewCategoryName('');
									setNewCategoryLimit('');
								}}
							>
								<Text style={styles.modalButtonTextCancel}>Cancel</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.modalButton, styles.modalButtonAdd]}
								onPress={() => addCategory()}
							>
								<Text style={styles.modalButtonTextAdd}>Add Category</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
		padding: 16,
	},
	center: {
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingText: {
		marginTop: 12,
		fontSize: 16,
		color: '#666',
	},
	title: {
		fontSize: 28,
		fontWeight: 'bold',
		marginBottom: 4,
		color: '#333',
	},
	subtitle: {
		fontSize: 14,
		color: '#666',
		marginBottom: 20,
	},
	card: {
		backgroundColor: '#fff',
		borderRadius: 16,
		padding: 20,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 3,
	},
	cardHeader: {
		marginBottom: 16,
	},
	cardTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#333',
		marginBottom: 4,
	},
	cardSubtitle: {
		fontSize: 14,
		color: '#666',
	},
	inputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 12,
		paddingHorizontal: 16,
		backgroundColor: '#f9f9f9',
	},
	currencySymbol: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
		marginRight: 8,
	},
	amountInput: {
		flex: 1,
		fontSize: 18,
		paddingVertical: 14,
		color: '#333',
	},
	progressContainer: {
		marginTop: 16,
	},
	progressBar: {
		height: 8,
		backgroundColor: '#e0e0e0',
		borderRadius: 4,
		overflow: 'hidden',
		marginBottom: 8,
	},
	progressFill: {
		height: '100%',
		borderRadius: 4,
	},
	progressText: {
		fontSize: 12,
		color: '#666',
		fontWeight: '500',
	},
	warningText: {
		fontSize: 12,
		color: '#FF3B30',
		fontWeight: '600',
		marginTop: 4,
	},
	section: {
		marginBottom: 16,
	},
	sectionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#333',
	},
	addButton: {
		backgroundColor: '#007AFF',
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 8,
	},
	addButtonText: {
		color: '#fff',
		fontSize: 14,
		fontWeight: '600',
	},
	quickAddContainer: {
		marginBottom: 16,
	},
	quickAddLabel: {
		fontSize: 14,
		color: '#666',
		marginBottom: 8,
	},
	quickAddScroll: {
		flexDirection: 'row',
	},
	quickAddChip: {
		backgroundColor: '#e3f2fd',
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 20,
		marginRight: 8,
	},
	quickAddChipText: {
		color: '#1976d2',
		fontSize: 14,
		fontWeight: '500',
	},
	categoryCard: {
		backgroundColor: '#fff',
		borderRadius: 16,
		padding: 16,
		marginBottom: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.08,
		shadowRadius: 4,
		elevation: 2,
	},
	categoryHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	categoryName: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333',
	},
	removeIcon: {
		padding: 4,
	},
	removeIconText: {
		fontSize: 18,
	},
	emptyState: {
		backgroundColor: '#fff',
		borderRadius: 16,
		padding: 32,
		alignItems: 'center',
		marginBottom: 12,
	},
	emptyText: {
		fontSize: 16,
		color: '#666',
		fontWeight: '500',
		marginBottom: 4,
	},
	emptySubtext: {
		fontSize: 14,
		color: '#999',
	},
	saveAllButton: {
		backgroundColor: '#007AFF',
		borderRadius: 12,
		padding: 16,
		alignItems: 'center',
		marginTop: 8,
		marginBottom: 32,
		shadowColor: '#007AFF',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
		elevation: 3,
	},
	saveAllButtonDisabled: {
		backgroundColor: '#ccc',
		shadowOpacity: 0,
	},
	saveAllButtonText: {
		color: '#fff',
		fontSize: 18,
		fontWeight: '600',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	modalContent: {
		backgroundColor: '#fff',
		borderRadius: 16,
		padding: 24,
		width: '100%',
		maxWidth: 400,
	},
	modalTitle: {
		fontSize: 22,
		fontWeight: 'bold',
		marginBottom: 20,
		color: '#333',
	},
	modalLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: '#333',
		marginBottom: 8,
		marginTop: 12,
	},
	modalInput: {
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 12,
		padding: 14,
		fontSize: 16,
		backgroundColor: '#f9f9f9',
	},
	modalButtons: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 24,
		gap: 12,
	},
	modalButton: {
		flex: 1,
		padding: 14,
		borderRadius: 12,
		alignItems: 'center',
	},
	modalButtonCancel: {
		backgroundColor: '#f0f0f0',
	},
	modalButtonAdd: {
		backgroundColor: '#007AFF',
	},
	modalButtonTextCancel: {
		color: '#333',
		fontSize: 16,
		fontWeight: '600',
	},
	modalButtonTextAdd: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
});
