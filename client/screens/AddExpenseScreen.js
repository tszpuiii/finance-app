import { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Modal, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../utils/api';
import * as Location from 'expo-location';
import { queueExpense } from '../utils/sync';
import { notify } from '../utils/notifications';
import { getBudgets } from '../services/budgets';
import CurrencyConverter from '../components/CurrencyConverter';

export default function AddExpenseScreen({ navigation }) {
	const [amount, setAmount] = useState('');
	const [category, setCategory] = useState('');
	const [loading, setLoading] = useState(false);
	const [coords, setCoords] = useState(null);
	const [placeName, setPlaceName] = useState('');
	const [categories, setCategories] = useState([]);
	const [showCategoryModal, setShowCategoryModal] = useState(false);
	const [showCurrencyConverter, setShowCurrencyConverter] = useState(false);

	// Load categories from budgets
	const loadCategories = useCallback(async () => {
		try {
			const budgets = await getBudgets();
			// Filter out old Chinese categories and ALL, get unique categories
			const oldCategories = ['交通', '飲食'];
			const validCategories = budgets
				.filter(b => 
					b.period === 'monthly' && 
					!oldCategories.includes(b.category) && 
					b.category !== 'ALL'
				)
				.map(b => b.category);
			
			// Add common categories if they don't exist
			const commonCategories = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Other'];
			const allCategories = [...new Set([...validCategories, ...commonCategories])].sort();
			
			setCategories(allCategories);
		} catch (err) {
			console.error('Failed to load categories:', err);
			// Fallback to common categories
			setCategories(['Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Other']);
		}
	}, []);

	useFocusEffect(
		useCallback(() => {
			loadCategories();
		}, [loadCategories])
	);

	function inferCategoryFromPlace(text) {
		const t = (text || '').toLowerCase();
		if (t.includes('starbucks') || t.includes('cafe') || t.includes('coffee') || t.includes('restaurant') || t.includes('food')) {
			return 'Food';
		}
		if (t.includes('7-eleven') || t.includes('convenience') || t.includes('store') || t.includes('shop')) {
			return 'Shopping';
		}
		if (t.includes('station') || t.includes('mtr') || t.includes('bus') || t.includes('metro') || t.includes('train')) {
			return 'Transport';
		}
		if (t.includes('market') || t.includes('mall') || t.includes('plaza') || t.includes('supermarket')) {
			return 'Shopping';
		}
		return '';
	}

	// Get location when component mounts
	useEffect(() => {
		(async () => {
			try {
				const { status } = await Location.requestForegroundPermissionsAsync();
				if (status !== 'granted') {
					console.log('Location permission not granted');
					return;
				}
				const pos = await Location.getCurrentPositionAsync({ 
					accuracy: Location.Accuracy.Balanced 
				});
				setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
				
				// Get location name from reverse geocoding
				const geos = await Location.reverseGeocodeAsync({
					latitude: pos.coords.latitude,
					longitude: pos.coords.longitude,
				});
				if (geos && geos.length > 0) {
					const g = geos[0];
					// Build location name from available fields
					const locationParts = [
						g.name,
						g.street,
						g.district,
						g.city,
						g.region
					].filter(Boolean);
					const name = locationParts.length > 0 
						? locationParts.join(', ') 
						: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
					setPlaceName(name);
					
					// Auto-suggest category based on location
					const guess = inferCategoryFromPlace(name);
					if (guess && !category) setCategory(guess);
				} else {
					// Fallback to coordinates if geocoding fails
					setPlaceName(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
				}
			} catch (err) {
				console.error('Location error:', err);
				// 忽略定位錯誤，維持手動輸入流程
			}
		})();
	}, []); // Only run once on mount

	const onSave = async () => {
		try {
			if (!amount || !category) {
				Alert.alert('Please enter amount and category');
				return;
			}
			setLoading(true);
		const payload = {
			amount: Number(amount),
			category,
			location: coords || undefined,
			locationName: placeName || undefined,
		};
			try {
				const { data } = await api.post('/expenses', payload);
				if (data?.alert) {
					const a = data.alert;
					const title = a.type === 'budget_exceeded' ? 'Budget Exceeded' : 'Budget Warning';
					const body = `${a.category} reached ${a.percent}% ($${a.spent} / $${a.limit})`;
					notify(title, body);
				}
				Alert.alert('Saved');
			} catch {
				await queueExpense(payload);
				Alert.alert('Offline Saved', 'Added to sync queue');
			}
			navigation.goBack();
		} catch (err) {
			Alert.alert('Save Failed', 'Please check login status or server connection');
		} finally {
			setLoading(false);
		}
	};

	return (
		<ScrollView style={styles.container}>
			<Text style={styles.title}>Add Expense</Text>
			
			<TextInput
				style={styles.input}
				placeholder="Amount (e.g. 120)"
				keyboardType="numeric"
				value={amount}
				onChangeText={setAmount}
			/>
			
			{/* Currency Converter Toggle Button */}
			<TouchableOpacity
				style={styles.currencyToggleButton}
				onPress={() => setShowCurrencyConverter(!showCurrencyConverter)}
			>
				<Text style={styles.currencyToggleText}>
					{showCurrencyConverter ? '▼ Hide' : '▶ Show'} Currency Converter
				</Text>
			</TouchableOpacity>
			
			{/* Currency Converter */}
			{showCurrencyConverter && (
				<CurrencyConverter
					amount={amount || '0'}
					onConvert={(convertedAmount, currency) => {
						// Optional: Auto-fill converted amount
						console.log('Converted:', convertedAmount, currency);
					}}
				/>
			)}
			{/* Category Dropdown */}
			<TouchableOpacity
				style={styles.dropdown}
				onPress={() => setShowCategoryModal(true)}
			>
				<Text style={category ? styles.dropdownText : styles.dropdownPlaceholder}>
					{category || 'Select Category'}
				</Text>
				<Text style={styles.dropdownArrow}>▼</Text>
			</TouchableOpacity>
			
			<Modal
				visible={showCategoryModal}
				transparent={true}
				animationType="slide"
				onRequestClose={() => setShowCategoryModal(false)}
			>
				<TouchableOpacity
					style={styles.modalOverlay}
					activeOpacity={1}
					onPress={() => setShowCategoryModal(false)}
				>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>Select Category</Text>
						<FlatList
							data={categories}
							keyExtractor={(item) => item}
							renderItem={({ item }) => (
								<TouchableOpacity
									style={[
										styles.categoryItem,
										category === item && styles.categoryItemSelected
									]}
									onPress={() => {
										setCategory(item);
										setShowCategoryModal(false);
									}}
								>
									<Text style={[
										styles.categoryItemText,
										category === item && styles.categoryItemTextSelected
									]}>
										{item}
									</Text>
									{category === item && <Text style={styles.checkmark}>✓</Text>}
								</TouchableOpacity>
							)}
						/>
						<Button title="Cancel" onPress={() => setShowCategoryModal(false)} />
					</View>
				</TouchableOpacity>
			</Modal>
			{placeName ? (
				<View style={styles.locationContainer}>
					<Text style={styles.locationLabel}>📍 Location:</Text>
					<Text style={styles.locationText}>{placeName}</Text>
				</View>
			) : (
				<Text style={styles.hint}>Location will be detected automatically</Text>
			)}
			<Button title={loading ? 'Saving...' : 'Save'} onPress={onSave} disabled={loading} />
		</ScrollView>
	);
}

	const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 24,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 16,
	},
	input: {
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		padding: 12,
		marginBottom: 12,
	},
	dropdown: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		padding: 12,
		marginBottom: 12,
		backgroundColor: '#fff',
	},
	dropdownText: {
		fontSize: 16,
		color: '#000',
	},
	dropdownPlaceholder: {
		fontSize: 16,
		color: '#999',
	},
	dropdownArrow: {
		fontSize: 12,
		color: '#666',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalContent: {
		backgroundColor: '#fff',
		borderRadius: 12,
		width: '80%',
		maxHeight: '70%',
		padding: 20,
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 16,
	},
	categoryItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	categoryItemSelected: {
		backgroundColor: '#f0f8ff',
	},
	categoryItemText: {
		fontSize: 16,
		color: '#000',
	},
	categoryItemTextSelected: {
		fontWeight: '600',
		color: '#007AFF',
	},
	checkmark: {
		fontSize: 18,
		color: '#007AFF',
		fontWeight: 'bold',
	},
	hint: { color: '#666', marginBottom: 12 },
	locationContainer: {
		backgroundColor: '#f0f8ff',
		borderRadius: 8,
		padding: 12,
		marginBottom: 12,
		borderLeftWidth: 3,
		borderLeftColor: '#007AFF',
	},
	locationLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: '#007AFF',
		marginBottom: 4,
	},
	locationText: {
		fontSize: 14,
		color: '#333',
	},
	currencyToggleButton: {
		backgroundColor: '#007AFF',
		borderRadius: 8,
		padding: 12,
		marginBottom: 12,
		alignItems: 'center',
	},
	currencyToggleText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
});


