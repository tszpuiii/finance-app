import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, Modal } from 'react-native';
import { getCurrency, formatCurrencySync } from '../utils/currencySettings';
import { deleteExpense, updateExpense } from '../services/expenses';
import { showImagePickerOptions } from '../utils/imagePicker';

export default function ExpenseDetailScreen({ route, navigation }) {
	const { expense: initialExpense } = route.params;
	const [expense, setExpense] = useState(initialExpense);
	const [currency, setCurrency] = useState('USD');
	const [imageModalVisible, setImageModalVisible] = useState(false);
	const [uploading, setUploading] = useState(false);

	useEffect(() => {
		loadCurrency();
	}, []);

	async function loadCurrency() {
		const curr = await getCurrency();
		setCurrency(curr);
	}

	function formatDate(date) {
		const d = new Date(date);
		return d.toLocaleString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatShortDate(date) {
		const d = new Date(date);
		return d.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	async function handleTakePhoto() {
		setUploading(true);
		try {
			const image = await showImagePickerOptions();
			if (image && image.base64) {
				// 將 base64 圖片上傳到服務器
				const imageData = `data:image/jpeg;base64,${image.base64}`;
				const updated = await updateExpense(expense._id, { receiptImage: imageData });
				setExpense(updated.expense);
				Alert.alert('Success', 'Receipt photo saved successfully');
			}
		} catch (error) {
			Alert.alert('Error', 'Failed to upload receipt photo');
		} finally {
			setUploading(false);
		}
	}

	async function handleDeletePhoto() {
		Alert.alert(
			'Delete Receipt Photo',
			'Are you sure you want to delete this receipt photo?',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete',
					style: 'destructive',
					onPress: async () => {
						try {
							const updated = await updateExpense(expense._id, { receiptImage: null });
							setExpense(updated.expense);
							Alert.alert('Success', 'Receipt photo deleted');
						} catch (error) {
							Alert.alert('Error', 'Failed to delete receipt photo');
						}
					}
				}
			]
		);
	}

	async function handleDelete() {
		Alert.alert(
			'Delete Expense',
			`Are you sure you want to delete this ${formatCurrencySync(expense.amount, currency)} expense?`,
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Delete',
					style: 'destructive',
					onPress: async () => {
						try {
							await deleteExpense(expense._id);
							navigation.goBack();
						} catch (error) {
							Alert.alert('Error', 'Failed to delete expense');
						}
					}
				}
			]
		);
	}

	return (
		<ScrollView style={styles.container}>
			{/* Back Button */}
			<TouchableOpacity 
				style={styles.backButton}
				onPress={() => navigation.goBack()}
			>
				<Text style={styles.backButtonText}>← Back</Text>
			</TouchableOpacity>

			{/* Header Card */}
			<View style={styles.headerCard}>
				<View style={styles.amountContainer}>
					<Text style={styles.amountLabel}>Amount</Text>
					<Text style={styles.amount}>{formatCurrencySync(expense.amount, currency)}</Text>
				</View>
				<View style={styles.categoryBadge}>
					<Text style={styles.categoryText}>{expense.category}</Text>
				</View>
			</View>

			{/* Details Card */}
			<View style={styles.card}>
				<Text style={styles.cardTitle}>Details</Text>
				
				<View style={styles.detailRow}>
					<Text style={styles.detailLabel}>Date</Text>
					<Text style={styles.detailValue}>{formatDate(expense.date)}</Text>
				</View>

				{expense.locationName && (
					<View style={styles.detailRow}>
						<Text style={styles.detailLabel}>📍 Location</Text>
						<Text style={styles.detailValue}>{expense.locationName}</Text>
					</View>
				)}

				{expense.note && (
					<View style={styles.noteContainer}>
						<Text style={styles.detailLabel}>Note</Text>
						<Text style={styles.noteText}>{expense.note}</Text>
					</View>
				)}

				{!expense.note && (
					<View style={styles.noteContainer}>
						<Text style={styles.detailLabel}>Note</Text>
						<Text style={styles.notePlaceholder}>No note added</Text>
					</View>
				)}
			</View>

			{/* Receipt Photo Card */}
			<View style={styles.card}>
				<View style={styles.receiptHeader}>
					<Text style={styles.cardTitle}>📷 Receipt Photo</Text>
					{!expense.receiptImage && (
						<TouchableOpacity 
							style={styles.addPhotoButton}
							onPress={handleTakePhoto}
							disabled={uploading}
						>
							<Text style={styles.addPhotoButtonText}>
								{uploading ? 'Uploading...' : '+ Add Photo'}
							</Text>
						</TouchableOpacity>
					)}
				</View>
				
				{expense.receiptImage ? (
					<View style={styles.receiptContainer}>
						<TouchableOpacity 
							onPress={() => setImageModalVisible(true)}
							style={styles.receiptImageContainer}
						>
							<Image 
								source={{ uri: expense.receiptImage }} 
								style={styles.receiptImage}
								resizeMode="cover"
							/>
							<View style={styles.imageOverlay}>
								<Text style={styles.viewImageText}>Tap to view full size</Text>
							</View>
						</TouchableOpacity>
						<TouchableOpacity 
							style={styles.deletePhotoButton}
							onPress={handleDeletePhoto}
						>
							<Text style={styles.deletePhotoButtonText}>🗑️ Delete Photo</Text>
						</TouchableOpacity>
					</View>
				) : (
					<View style={styles.noReceiptContainer}>
						<Text style={styles.noReceiptText}>No receipt photo</Text>
						<Text style={styles.noReceiptSubtext}>Tap "Add Photo" to take or select a photo</Text>
					</View>
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
					style={styles.modalOverlay}
					activeOpacity={1}
					onPress={() => setImageModalVisible(false)}
				>
					<View style={styles.modalImageContainer}>
						<Image 
							source={{ uri: expense.receiptImage }} 
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

			{/* Action Buttons */}
			<View style={styles.actionsContainer}>
				<TouchableOpacity 
					style={styles.editButton} 
					onPress={() => navigation.navigate('EditExpense', { expense })}
				>
					<Text style={styles.editButtonText}>✏️ Edit Expense</Text>
				</TouchableOpacity>
				<TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
					<Text style={styles.deleteButtonText}>🗑️ Delete Expense</Text>
				</TouchableOpacity>
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
	},
	backButton: {
		backgroundColor: '#fff',
		paddingHorizontal: 16,
		paddingVertical: 12,
		marginBottom: 8,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 2,
	},
	backButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#007AFF',
	},
	headerCard: {
		backgroundColor: '#fff',
		padding: 24,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	amountContainer: {
		marginBottom: 16,
	},
	amountLabel: {
		fontSize: 14,
		color: '#666',
		marginBottom: 8,
		fontWeight: '500',
	},
	amount: {
		fontSize: 36,
		fontWeight: 'bold',
		color: '#007AFF',
	},
	categoryBadge: {
		alignSelf: 'flex-start',
		backgroundColor: '#007AFF',
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 20,
	},
	categoryText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
	card: {
		backgroundColor: '#fff',
		padding: 20,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	cardTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 16,
		color: '#333',
	},
	detailRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
	},
	detailLabel: {
		fontSize: 14,
		color: '#666',
		fontWeight: '500',
		flex: 1,
	},
	detailValue: {
		fontSize: 14,
		color: '#333',
		flex: 2,
		textAlign: 'right',
	},
	noteContainer: {
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
	},
	noteText: {
		fontSize: 14,
		color: '#333',
		marginTop: 8,
		lineHeight: 20,
	},
	notePlaceholder: {
		fontSize: 14,
		color: '#999',
		fontStyle: 'italic',
		marginTop: 8,
	},
	actionsContainer: {
		padding: 20,
		paddingBottom: 40,
		gap: 12,
	},
	editButton: {
		backgroundColor: '#007AFF',
		borderRadius: 12,
		padding: 16,
		alignItems: 'center',
		shadowColor: '#007AFF',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
		elevation: 3,
	},
	editButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
	deleteButton: {
		backgroundColor: '#FF3B30',
		borderRadius: 12,
		padding: 16,
		alignItems: 'center',
		shadowColor: '#FF3B30',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
		elevation: 3,
	},
	deleteButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
	receiptHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	addPhotoButton: {
		backgroundColor: '#007AFF',
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 8,
	},
	addPhotoButtonText: {
		color: '#fff',
		fontSize: 14,
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
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 8,
	},
	deletePhotoButtonText: {
		color: '#fff',
		fontSize: 14,
		fontWeight: '600',
	},
	noReceiptContainer: {
		alignItems: 'center',
		padding: 20,
	},
	noReceiptText: {
		fontSize: 14,
		color: '#999',
		marginBottom: 4,
	},
	noReceiptSubtext: {
		fontSize: 12,
		color: '#ccc',
		fontStyle: 'italic',
	},
	modalOverlay: {
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

