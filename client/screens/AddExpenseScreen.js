import { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Modal, TouchableOpacity, FlatList, ScrollView, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../utils/api';
import * as Location from 'expo-location';
import { queueExpense, syncPendingExpenses } from '../utils/sync';
import { notify } from '../utils/notifications';
import { getBudgets } from '../services/budgets';
import CurrencyConverter from '../components/CurrencyConverter';
import { showImagePickerOptions } from '../utils/imagePicker';
import { useTheme } from '../contexts/ThemeContext';

export default function AddExpenseScreen({ navigation }) {
	const { theme, isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const [amount, setAmount] = useState('');
	const [category, setCategory] = useState('');
	const [note, setNote] = useState('');
	const [receiptImage, setReceiptImage] = useState(null);
	const [loading, setLoading] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [coords, setCoords] = useState(null);
	const [placeName, setPlaceName] = useState('');
	const [categories, setCategories] = useState([]);
	const [showCategoryModal, setShowCategoryModal] = useState(false);
	const [showCurrencyConverter, setShowCurrencyConverter] = useState(false);
	const [imageModalVisible, setImageModalVisible] = useState(false);

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

	// Function to get location (non-blocking)
	const getCurrentLocation = useCallback(async () => {
			try {
			// Check if location services are available (may not be available in some environments)
			let isEnabled = false;
			try {
				isEnabled = await Location.hasServicesEnabledAsync();
			} catch (e) {
				// hasServicesEnabledAsync may not be available in some environments, continue trying
				console.log('Could not check location services status, continuing...');
			}

			if (!isEnabled) {
				console.log('Location services are not enabled');
				return null;
			}

			// Request location permission
				const { status } = await Location.requestForegroundPermissionsAsync();
				if (status !== 'granted') {
				console.log('Location permission not granted, status:', status);
				return null;
				}

			// 獲取當前位置（使用更寬鬆的設置以適配模擬器）
				const pos = await Location.getCurrentPositionAsync({ 
				accuracy: Location.Accuracy.Lowest, // 使用最低精度，在模擬器中更容易成功
				timeout: 5000, // 5秒超時
				maximumAge: 300000, // 允許使用5分鐘內的緩存位置
			});
			
			if (!pos || !pos.coords) {
				console.log('Invalid position data received');
				return null;
			}

			const locationData = {
				coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
				placeName: ''
			};
				
			// 嘗試獲取位置名稱（反向地理編碼）- 可選，失敗不影響
			try {
				const geos = await Location.reverseGeocodeAsync({
					latitude: pos.coords.latitude,
					longitude: pos.coords.longitude,
				});
				if (geos && geos.length > 0) {
					const g = geos[0];
					// 構建位置名稱
					const locationParts = [
						g.name,
						g.street,
						g.district,
						g.city,
						g.region
					].filter(Boolean);
					locationData.placeName = locationParts.length > 0 
						? locationParts.join(', ') 
						: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
				} else {
					// 如果反向地理編碼失敗，使用座標
					locationData.placeName = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
				}
			} catch (geocodeError) {
				// 如果反向地理編碼失敗，使用座標
				console.log('Reverse geocoding failed, using coordinates');
				locationData.placeName = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
				}

			console.log('Location obtained successfully:', locationData);
			return locationData;
			} catch (err) {
			// 靜默處理錯誤，不阻止保存支出
			console.log('Location error (non-blocking):', err.message || err);
			return null;
		}
	}, []);

	// 在組件掛載時獲取位置（用於顯示）
	useEffect(() => {
		(async () => {
			const locationData = await getCurrentLocation();
			if (locationData) {
				setCoords(locationData.coords);
				setPlaceName(locationData.placeName);
				
				// 根據位置自動建議類別
				const guess = inferCategoryFromPlace(locationData.placeName);
				if (guess && !category) {
					setCategory(guess);
				}
			}
		})();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // 只在組件掛載時執行一次

	const onSave = async () => {
			if (!amount || !category) {
				Alert.alert('Please enter amount and category');
				return;
			}

			setLoading(true);

		try {
			// 如果還沒有位置數據，嘗試獲取（不阻塞保存）
			let finalCoords = coords;
			let finalPlaceName = placeName;
			
			if (!finalCoords) {
				console.log('No location data, attempting to get location...');
				// 使用 Promise.race 確保不會長時間等待
				try {
					const locationData = await Promise.race([
						getCurrentLocation(),
						new Promise((resolve) => setTimeout(() => resolve(null), 3000)) // 3秒超時
					]);
					if (locationData) {
						finalCoords = locationData.coords;
						finalPlaceName = locationData.placeName;
						console.log('Location obtained:', { coords: finalCoords, placeName: finalPlaceName });
						// 更新狀態以便顯示
						setCoords(finalCoords);
						setPlaceName(finalPlaceName);
					} else {
						console.log('Location not available or timeout');
					}
				} catch (locationError) {
					// 位置獲取失敗不影響保存
					console.log('Location fetch failed (non-blocking):', locationError.message || locationError);
				}
			} else {
				console.log('Using existing location:', { coords: finalCoords, placeName: finalPlaceName });
			}

		const payload = {
			amount: Number(amount),
			category,
				note: note.trim() || undefined,
				location: finalCoords || undefined,
				locationName: finalPlaceName || undefined,
				receiptImage: receiptImage || undefined,
			};

			console.log('Saving expense with payload:', {
				amount: payload.amount,
				category: payload.category,
				hasLocation: !!payload.location,
				hasLocationName: !!payload.locationName,
				hasNote: !!payload.note,
				hasReceiptImage: !!payload.receiptImage
			});

			try {
				const { data } = await api.post('/expenses', payload);
				console.log('Expense saved successfully:', data);
				
				if (data?.alert) {
					const a = data.alert;
					const title = a.type === 'budget_exceeded' ? 'Budget Exceeded' : 'Budget Warning';
					const body = `${a.category} reached ${a.percent}% ($${a.spent} / $${a.limit})`;
					notify(title, body);
				}
				Alert.alert('Saved', 'Expense saved successfully');
				// 導航回 Dashboard，useFocusEffect 會自動刷新
				navigation.navigate('Dashboard');
			} catch (error) {
				console.error('Save error:', error);
				console.error('Error details:', error.response?.data || error.message);
				
				// 如果保存失敗，先嘗試同步離線隊列，然後再試一次
				try {
					await syncPendingExpenses();
					// 再次嘗試保存
				const { data } = await api.post('/expenses', payload);
				if (data?.alert) {
					const a = data.alert;
					const title = a.type === 'budget_exceeded' ? 'Budget Exceeded' : 'Budget Warning';
					const body = `${a.category} reached ${a.percent}% ($${a.spent} / $${a.limit})`;
					notify(title, body);
				}
					Alert.alert('Saved', 'Expense saved successfully');
					navigation.navigate('Dashboard');
				} catch (retryError) {
					// 如果還是失敗，加入離線隊列
					console.error('Retry save error:', retryError);
				await queueExpense(payload);
					Alert.alert('Offline Saved', 'Added to sync queue. Will sync when connection is available.');
					navigation.navigate('Dashboard');
				}
			}
		} catch (err) {
			console.error('onSave error:', err);
			Alert.alert('Save Failed', err.message || 'Please check login status or server connection');
		} finally {
			setLoading(false);
		}
	};

	const styles = getStyles(theme, isDarkMode);

	return (
		<ScrollView 
			style={styles.container}
			contentContainerStyle={{ paddingTop: insets.top }}
		>
			<Text style={styles.title}>Add Expense</Text>
			
			<TextInput
				style={styles.input}
				placeholder="Amount (e.g. 120)"
				placeholderTextColor={theme.textSecondary}
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
			
			<TextInput
				style={[styles.input, styles.noteInput]}
				placeholder="Note (optional)"
				placeholderTextColor={theme.textSecondary}
				multiline
				numberOfLines={3}
				value={note}
				onChangeText={setNote}
				textAlignVertical="top"
			/>

			{/* Receipt Photo Section */}
			<View style={styles.receiptSection}>
				<Text style={styles.sectionTitle}>📷 Receipt Photo (Optional)</Text>
				
				{receiptImage ? (
					<View style={styles.receiptContainer}>
						<TouchableOpacity 
							onPress={() => setImageModalVisible(true)}
							style={styles.receiptImageContainer}
						>
							<Image 
								source={{ uri: receiptImage }} 
								style={styles.receiptImage}
								resizeMode="cover"
							/>
							<View style={styles.imageOverlay}>
								<Text style={styles.viewImageText}>Tap to view</Text>
							</View>
						</TouchableOpacity>
						<TouchableOpacity 
							style={styles.deletePhotoButton}
							onPress={() => setReceiptImage(null)}
						>
							<Text style={styles.deletePhotoButtonText}>🗑️ Remove Photo</Text>
						</TouchableOpacity>
					</View>
				) : (
					<TouchableOpacity 
						style={styles.addPhotoButton}
						onPress={async () => {
							setUploading(true);
							try {
								const image = await showImagePickerOptions();
								if (image && image.base64) {
									const imageData = `data:image/jpeg;base64,${image.base64}`;
									setReceiptImage(imageData);
								}
							} catch (error) {
								Alert.alert('Error', 'Failed to select image');
							} finally {
								setUploading(false);
							}
						}}
						disabled={uploading}
					>
						<Text style={styles.addPhotoButtonText}>
							{uploading ? 'Loading...' : '+ Add Receipt Photo'}
						</Text>
					</TouchableOpacity>
				)}
			</View>

			{/* Image Modal */}
			<Modal
				visible={imageModalVisible}
				transparent={true}
				animationType="fade"
				onRequestClose={() => setImageModalVisible(false)}
			>
				<TouchableOpacity
					style={styles.modalImageOverlay}
					activeOpacity={1}
					onPress={() => setImageModalVisible(false)}
				>
					<View style={styles.modalImageContainer}>
						<Image 
							source={{ uri: receiptImage }} 
							style={styles.modalImage}
							resizeMode="contain"
						/>
						<TouchableOpacity
							style={styles.closeModalButton}
							onPress={() => setImageModalVisible(false)}
						>
							<Text style={styles.closeModalText}>✕ Close</Text>
						</TouchableOpacity>
					</View>
				</TouchableOpacity>
			</Modal>
			
			<TouchableOpacity 
				style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
				onPress={onSave} 
				disabled={loading}
			>
				<Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Expense'}</Text>
			</TouchableOpacity>
		</ScrollView>
	);
}

function getStyles(theme, isDarkMode) {
	return StyleSheet.create({
	container: {
		flex: 1,
		padding: 24,
			backgroundColor: theme.background,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 16,
			color: theme.text,
	},
	input: {
		borderWidth: 1,
		borderColor: theme.border,
		borderRadius: 8,
		padding: 12,
		marginBottom: 12,
		backgroundColor: theme.surface,
		color: theme.text,
	},
	dropdown: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderWidth: 1,
		borderColor: theme.border,
		borderRadius: 8,
		padding: 12,
		marginBottom: 12,
		backgroundColor: theme.surface,
	},
	dropdownText: {
		fontSize: 16,
			color: theme.text,
	},
	dropdownPlaceholder: {
		fontSize: 16,
		color: theme.textSecondary,
	},
	dropdownArrow: {
		fontSize: 12,
			color: theme.textSecondary,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalContent: {
		backgroundColor: theme.surface,
		borderRadius: 12,
		width: '80%',
		maxHeight: '70%',
		padding: 20,
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 16,
			color: theme.text,
	},
	categoryItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: 16,
		borderBottomWidth: 1,
			borderBottomColor: theme.border,
	},
	categoryItemSelected: {
			backgroundColor: theme.primary + '20',
	},
	categoryItemText: {
		fontSize: 16,
			color: theme.text,
	},
	categoryItemTextSelected: {
		fontWeight: '600',
			color: theme.primary,
	},
	checkmark: {
		fontSize: 18,
			color: theme.primary,
		fontWeight: 'bold',
	},
		hint: { 
			color: theme.textSecondary, 
			marginBottom: 12 
		},
	locationContainer: {
			backgroundColor: theme.primary + '20',
		borderRadius: 8,
		padding: 12,
		marginBottom: 12,
		borderLeftWidth: 3,
			borderLeftColor: theme.primary,
	},
	locationLabel: {
		fontSize: 12,
		fontWeight: '600',
			color: theme.primary,
		marginBottom: 4,
	},
	locationText: {
		fontSize: 14,
			color: theme.text,
	},
	currencyToggleButton: {
			backgroundColor: theme.primary,
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
		noteInput: {
			minHeight: 80,
			textAlignVertical: 'top',
		},
		saveButton: {
			backgroundColor: theme.primary,
			borderRadius: 12,
			padding: 16,
			alignItems: 'center',
			marginTop: 8,
			shadowColor: theme.primary,
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.2,
			shadowRadius: 4,
			elevation: 3,
		},
		saveButtonDisabled: {
			backgroundColor: theme.border,
			shadowOpacity: 0,
		},
		saveButtonText: {
			color: '#fff',
			fontSize: 18,
			fontWeight: '600',
		},
		receiptSection: {
			marginBottom: 16,
		},
		sectionTitle: {
			fontSize: 16,
			fontWeight: '600',
			color: theme.text,
			marginBottom: 12,
		},
		addPhotoButton: {
			backgroundColor: theme.primary,
			borderRadius: 8,
			padding: 16,
			alignItems: 'center',
		},
		addPhotoButtonText: {
			color: '#fff',
			fontSize: 16,
			fontWeight: '600',
		},
		receiptContainer: {
			alignItems: 'center',
		},
		receiptImageContainer: {
			width: '100%',
			height: 200,
			borderRadius: 12,
			overflow: 'hidden',
			marginBottom: 12,
			position: 'relative',
			backgroundColor: theme.border,
		},
		receiptImage: {
			width: '100%',
			height: '100%',
		},
		imageOverlay: {
			position: 'absolute',
			bottom: 0,
			left: 0,
			right: 0,
			backgroundColor: 'rgba(0, 0, 0, 0.5)',
			padding: 8,
			alignItems: 'center',
		},
		viewImageText: {
			color: '#fff',
			fontSize: 12,
			fontWeight: '500',
		},
		deletePhotoButton: {
			backgroundColor: theme.error,
			borderRadius: 8,
			paddingHorizontal: 16,
			paddingVertical: 10,
			alignSelf: 'stretch',
			alignItems: 'center',
		},
		deletePhotoButtonText: {
			color: '#fff',
			fontSize: 14,
			fontWeight: '600',
		},
		modalImageOverlay: {
			flex: 1,
			backgroundColor: 'rgba(0, 0, 0, 0.9)',
			justifyContent: 'center',
			alignItems: 'center',
		},
		modalImageContainer: {
			width: '90%',
			height: '80%',
			justifyContent: 'center',
			alignItems: 'center',
		},
		modalImage: {
			width: '100%',
			height: '100%',
		},
		closeModalButton: {
			position: 'absolute',
			top: 40,
			right: 20,
			backgroundColor: 'rgba(0, 0, 0, 0.7)',
			paddingHorizontal: 16,
			paddingVertical: 10,
			borderRadius: 8,
		},
		closeModalText: {
			color: '#fff',
			fontSize: 16,
			fontWeight: '600',
		},
});
}


