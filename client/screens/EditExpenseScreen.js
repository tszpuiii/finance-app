import { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Modal, TouchableOpacity, FlatList, ScrollView, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../utils/api';
import { updateExpense } from '../services/expenses';
import { getBudgets } from '../services/budgets';
import { showImagePickerOptions } from '../utils/imagePicker';

export default function EditExpenseScreen({ route, navigation }) {
	const { expense } = route.params;
	const [amount, setAmount] = useState(expense.amount?.toString() || '');
	const [category, setCategory] = useState(expense.category || '');
	const [note, setNote] = useState(expense.note || '');
	const [receiptImage, setReceiptImage] = useState(expense.receiptImage || null);
	const [loading, setLoading] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [categories, setCategories] = useState([]);
	const [showCategoryModal, setShowCategoryModal] = useState(false);
	const [imageModalVisible, setImageModalVisible] = useState(false);

	// Load categories from budgets
	const loadCategories = useCallback(async () => {
		try {
			const budgets = await getBudgets();
			const oldCategories = ['交通', '飲食'];
			const validCategories = budgets
				.filter(b => 
					b.period === 'monthly' && 
					!oldCategories.includes(b.category) && 
					b.category !== 'ALL'
				)
				.map(b => b.category);
			
			const commonCategories = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Other'];
			const allCategories = [...new Set([...validCategories, ...commonCategories])].sort();
			
			setCategories(allCategories);
		} catch (err) {
			console.error('Failed to load categories:', err);
			setCategories(['Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Other']);
		}
	}, []);

	useFocusEffect(
		useCallback(() => {
			loadCategories();
		}, [loadCategories])
	);

	async function handleTakePhoto() {
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
	}

	function handleDeletePhoto() {
		Alert.alert(
			'Delete Receipt Photo',
			'Are you sure you want to delete this receipt photo?',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete',
					style: 'destructive',
					onPress: () => {
						setReceiptImage(null);
					}
				}
			]
		);
	}

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
				note: note.trim() || undefined,
				receiptImage: receiptImage || undefined,
			};
			
			try {
				await updateExpense(expense._id, payload);
				Alert.alert('Success', 'Expense updated successfully');
				navigation.goBack();
			} catch (error) {
				Alert.alert('Error', 'Failed to update expense');
			}
		} catch (err) {
			Alert.alert('Error', 'Please check your connection');
		} finally {
			setLoading(false);
		}
	};

	return (
		<ScrollView style={styles.container}>
			<Text style={styles.title}>Edit Expense</Text>
			
			<TextInput
				style={styles.input}
				placeholder="Amount (e.g. 120)"
				keyboardType="numeric"
				value={amount}
				onChangeText={setAmount}
			/>
			
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
			
			{expense.locationName && (
				<View style={styles.locationContainer}>
					<Text style={styles.locationLabel}>📍 Location:</Text>
					<Text style={styles.locationText}>{expense.locationName}</Text>
					<Text style={styles.locationHint}>(Location cannot be changed)</Text>
				</View>
			)}
			
			<TextInput
				style={[styles.input, styles.noteInput]}
				placeholder="Note (optional)"
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
							onPress={handleDeletePhoto}
						>
							<Text style={styles.deletePhotoButtonText}>🗑️ Remove Photo</Text>
						</TouchableOpacity>
					</View>
				) : (
					<TouchableOpacity 
						style={styles.addPhotoButton}
						onPress={handleTakePhoto}
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
				<Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Changes'}</Text>
			</TouchableOpacity>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 24,
		backgroundColor: '#f5f5f5',
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 16,
		color: '#333',
	},
	input: {
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		padding: 12,
		marginBottom: 12,
		fontSize: 16,
	},
	dropdown: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#fff',
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		padding: 12,
		marginBottom: 12,
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
	locationHint: {
		fontSize: 11,
		color: '#999',
		marginTop: 4,
		fontStyle: 'italic',
	},
	noteInput: {
		minHeight: 80,
		textAlignVertical: 'top',
	},
	saveButton: {
		backgroundColor: '#007AFF',
		borderRadius: 12,
		padding: 16,
		alignItems: 'center',
		marginTop: 8,
		shadowColor: '#007AFF',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
		elevation: 3,
	},
	saveButtonDisabled: {
		backgroundColor: '#ccc',
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
		color: '#333',
		marginBottom: 12,
	},
	addPhotoButton: {
		backgroundColor: '#007AFF',
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
		backgroundColor: '#f0f0f0',
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
		backgroundColor: '#FF3B30',
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

