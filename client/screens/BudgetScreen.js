import { useCallback, useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getBudgets, upsertBudget, getBudgetStatus, deleteBudget } from '../services/budgets';
import { getCurrency, formatCurrencySync, getCurrencySymbol } from '../utils/currencySettings';

export default function BudgetScreen() {
	const [overall, setOverall] = useState('');
	const [customCategories, setCustomCategories] = useState([]); // [{ category: string, limit: string }]
	const [newCategoryName, setNewCategoryName] = useState('');
	const [newCategoryLimit, setNewCategoryLimit] = useState('');
	const [status, setStatus] = useState([]);
	const [loading, setLoading] = useState(false);
	const [currency, setCurrency] = useState('USD');

	useEffect(() => {
		loadCurrency();
	}, []);

	async function loadCurrency() {
		const curr = await getCurrency();
		setCurrency(curr);
	}

	const load = useCallback(async () => {
		try {
			console.log('Loading budget data...');
			const [budgets, s] = await Promise.all([getBudgets(), getBudgetStatus()]);
			console.log('Received budgets:', budgets);
			console.log('Received budget status:', s);
			
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
			
			// Set custom categories
			setCustomCategories(validBudgets.map(b => ({
				category: b.category,
				limit: b.limit?.toString() || ''
			})));
			
			console.log('Budget status updated in state');
		} catch (err) {
			console.error('Failed to load budget data:', err);
			console.error('Error details:', err.response?.data || err.message);
			Alert.alert('Load Failed', err.message || 'Failed to load budget data');
		}
	}, []);

	// 當頁面獲得焦點時自動刷新
	useFocusEffect(
		useCallback(() => {
			console.log('BudgetScreen 獲得焦點，刷新數據');
			load();
		}, [load])
	);

	async function save() {
		try {
			setLoading(true);
			const ops = [];
			
			// Save overall budget
			if (overall) {
				ops.push(upsertBudget({ category: 'ALL', limit: Number(overall) }));
			}
			
			// Save custom categories
			for (const cat of customCategories) {
				if (cat.limit) {
					ops.push(upsertBudget({ category: cat.category, limit: Number(cat.limit) }));
				}
			}
			
			await Promise.all(ops);
			console.log('Budget saved, refreshing status...');
			await load();
			Alert.alert('Budget Saved');
		} catch (err) {
			console.error('Save budget error:', err);
			Alert.alert('Save Failed', err.message || 'Please try again');
		} finally {
			setLoading(false);
		}
	}

	async function addCategory() {
		if (!newCategoryName.trim()) {
			Alert.alert('Error', 'Please enter a category name');
			return;
		}
		if (!newCategoryLimit || isNaN(Number(newCategoryLimit))) {
			Alert.alert('Error', 'Please enter a valid budget limit');
			return;
		}
		
		// Check if category already exists
		if (customCategories.some(c => c.category === newCategoryName.trim())) {
			Alert.alert('Error', 'Category already exists');
			return;
		}
		
		// Don't allow ALL as custom category
		if (newCategoryName.trim().toUpperCase() === 'ALL') {
			Alert.alert('Error', 'ALL is reserved for total budget');
			return;
		}
		
		const newCat = {
			category: newCategoryName.trim(),
			limit: newCategoryLimit
		};
		
		setCustomCategories([...customCategories, newCat]);
		setNewCategoryName('');
		setNewCategoryLimit('');
	}

	async function removeCategory(categoryToRemove) {
		Alert.alert(
			'Remove Category',
			`Are you sure you want to remove "${categoryToRemove}"?`,
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Remove',
					style: 'destructive',
					onPress: async () => {
						try {
							// Delete from backend
							await deleteBudget(categoryToRemove);
							// Remove from local state
							setCustomCategories(customCategories.filter(c => c.category !== categoryToRemove));
							// Reload to update status
							await load();
							Alert.alert('Category Removed');
						} catch (err) {
							console.error('Remove category error:', err);
							Alert.alert('Remove Failed', err.message || 'Failed to remove category');
						}
					}
				}
			]
		);
	}

	function updateCategoryLimit(category, newLimit) {
		setCustomCategories(customCategories.map(c => 
			c.category === category ? { ...c, limit: newLimit } : c
		));
	}

	return (
		<ScrollView style={styles.container}>
			<Text style={styles.title}>Budget Settings (Monthly)</Text>
			
			{/* Total Budget */}
			<Text style={styles.sectionLabel}>Total Budget (ALL)</Text>
			<TextInput 
				style={styles.input} 
				placeholder="Total Budget (ALL)" 
				keyboardType="numeric" 
				value={overall} 
				onChangeText={setOverall} 
			/>
			
			{/* Custom Categories */}
			<Text style={styles.sectionLabel}>Sub Categories</Text>
			{customCategories.map((cat, index) => (
				<View key={cat.category} style={styles.categoryRow}>
					<View style={styles.categoryInputContainer}>
						<Text style={styles.categoryLabel}>{cat.category}</Text>
						<TextInput
							style={[styles.input, styles.categoryInput]}
							placeholder="Budget limit"
							keyboardType="numeric"
							value={cat.limit}
							onChangeText={(text) => updateCategoryLimit(cat.category, text)}
						/>
					</View>
					<TouchableOpacity
						style={styles.removeButton}
						onPress={() => removeCategory(cat.category)}
					>
						<Text style={styles.removeButtonText}>Remove</Text>
					</TouchableOpacity>
				</View>
			))}
			
			{/* Add New Category */}
			<Text style={styles.sectionLabel}>Add New Category</Text>
			<TextInput
				style={styles.input}
				placeholder="Category name (e.g., Shopping, Entertainment)"
				value={newCategoryName}
				onChangeText={setNewCategoryName}
			/>
			<View style={styles.addCategoryRow}>
				<TextInput
					style={[styles.input, styles.addCategoryInput]}
					placeholder="Budget limit"
					keyboardType="numeric"
					value={newCategoryLimit}
					onChangeText={setNewCategoryLimit}
				/>
				<Button title="Add" onPress={addCategory} />
			</View>
			
			<Button title={loading ? 'Saving...' : 'Save All'} onPress={save} disabled={loading} />
			
			<View style={{ height: 16 }} />
			<Text style={styles.title}>Budget Status</Text>
			{status.length === 0 ? (
				<Text style={styles.status}>No budgets set</Text>
			) : (
				status
					.filter((s) => {
						// Filter out old Chinese categories
						const oldCategories = ['交通', '飲食'];
						return !oldCategories.includes(s.category);
					})
					.map((s) => {
						const categoryName = s.category === 'ALL' ? 'Total Budget' : s.category;
						const percent = Math.round(s.ratio * 100);
						return (
							<Text key={s.category} style={styles.status}>
								{`${categoryName}: ${formatCurrencySync(s.spent, currency)} / ${formatCurrencySync(s.limit, currency)} (${percent}%)`}
							</Text>
						);
					})
			)}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 24 },
	title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
	sectionLabel: {
		fontSize: 16,
		fontWeight: '600',
		marginTop: 16,
		marginBottom: 8,
		color: '#333'
	},
	input: {
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		padding: 12,
		marginBottom: 12,
	},
	categoryRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	categoryInputContainer: {
		flex: 1,
		marginRight: 8,
	},
	categoryLabel: {
		fontSize: 14,
		fontWeight: '500',
		marginBottom: 4,
		color: '#666'
	},
	categoryInput: {
		marginBottom: 0,
	},
	addCategoryRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	addCategoryInput: {
		flex: 1,
		marginRight: 8,
		marginBottom: 0,
	},
	removeButton: {
		backgroundColor: '#FF3B30',
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 8,
	},
	removeButtonText: {
		color: '#fff',
		fontWeight: '600',
		fontSize: 14,
	},
	status: { fontSize: 14, color: '#333', marginBottom: 6 },
});
