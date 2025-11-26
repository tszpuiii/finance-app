import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getCurrency, setCurrency, getCurrencySymbol } from '../utils/currencySettings';
import { COMMON_CURRENCIES } from '../services/currency';
import { convertCurrency } from '../services/currency';
import { convertAllExpenses } from '../services/expenses';
import { convertAllBudgets } from '../services/budgets';

export default function CurrencySettingsScreen() {
	const [selectedCurrency, setSelectedCurrency] = useState('USD');
	const [showModal, setShowModal] = useState(false);
	const [loading, setLoading] = useState(false);

	useFocusEffect(
		useCallback(() => {
			loadCurrency();
		}, [])
	);

	async function loadCurrency() {
		const currency = await getCurrency();
		setSelectedCurrency(currency);
	}

	async function handleCurrencyChange(currencyCode) {
		if (currencyCode === selectedCurrency) {
			setShowModal(false);
			return;
		}

		// Ask user if they want to convert existing amounts
		Alert.alert(
			'Convert Currency',
			`Do you want to convert all existing expenses and budgets from ${selectedCurrency} to ${currencyCode}?`,
			[
				{
					text: 'Cancel',
					style: 'cancel',
					onPress: () => setShowModal(false)
				},
				{
					text: 'Convert All',
					onPress: async () => {
						await performCurrencyConversion(currencyCode, true);
					}
				},
				{
					text: 'Change Only',
					style: 'default',
					onPress: async () => {
						await performCurrencyConversion(currencyCode, false);
					}
				}
			]
		);
	}

	async function performCurrencyConversion(newCurrency, convertAmounts) {
		setLoading(true);
		try {
			const oldCurrency = selectedCurrency;
			
			// If converting amounts, get exchange rate and update all data
			if (convertAmounts) {
				// Get exchange rate
				const conversionResult = await convertCurrency(1, oldCurrency, newCurrency);
				const exchangeRate = conversionResult.rate;
				
				// Convert all expenses
				const expenseResult = await convertAllExpenses(oldCurrency, newCurrency, exchangeRate);
				console.log('Expenses converted:', expenseResult);
				
				// Convert all budgets
				const budgetResult = await convertAllBudgets(oldCurrency, newCurrency, exchangeRate);
				console.log('Budgets converted:', budgetResult);
				
				// Save new currency setting
				await setCurrency(newCurrency);
				setSelectedCurrency(newCurrency);
				setShowModal(false);
				
				Alert.alert(
					'Success',
					`Currency changed to ${newCurrency}\n\nConverted:\n- ${expenseResult.updated} expenses\n- ${budgetResult.updated} budgets\n\nExchange rate: ${exchangeRate.toFixed(4)}`
				);
			} else {
				// Just change currency setting without converting amounts
				const success = await setCurrency(newCurrency);
				if (success) {
					setSelectedCurrency(newCurrency);
					setShowModal(false);
					Alert.alert('Success', `Currency changed to ${newCurrency}\n\nNote: Existing amounts are not converted.`);
				} else {
					Alert.alert('Error', 'Failed to save currency setting');
				}
			}
		} catch (err) {
			console.error('Failed to change currency:', err);
			Alert.alert('Error', `Failed to change currency: ${err.message || 'Unknown error'}`);
		} finally {
			setLoading(false);
		}
	}

	function getCurrencyName(code) {
		const currency = COMMON_CURRENCIES.find(c => c.code === code);
		return currency?.name || code;
	}

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Currency Settings</Text>
			<Text style={styles.description}>
				Set your preferred currency for the entire app. All amounts will be displayed in this currency.
			</Text>

			{loading && (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#007AFF" />
					<Text style={styles.loadingText}>Converting amounts...</Text>
				</View>
			)}

			<View style={styles.currentCurrencyContainer}>
				<Text style={styles.label}>Current Currency</Text>
				<TouchableOpacity
					style={[styles.currencyButton, loading && styles.currencyButtonDisabled]}
					onPress={() => setShowModal(true)}
					disabled={loading}
				>
					<View style={styles.currencyInfo}>
						<Text style={styles.currencySymbol}>{getCurrencySymbol(selectedCurrency)}</Text>
						<View style={styles.currencyDetails}>
							<Text style={styles.currencyCode}>{selectedCurrency}</Text>
							<Text style={styles.currencyName}>{getCurrencyName(selectedCurrency)}</Text>
						</View>
					</View>
					<Text style={styles.arrow}>▼</Text>
				</TouchableOpacity>
			</View>

			<View style={styles.previewContainer}>
				<Text style={styles.previewLabel}>Preview</Text>
				<Text style={styles.previewAmount}>
					{getCurrencySymbol(selectedCurrency)}1,234.56
				</Text>
				<Text style={styles.previewNote}>
					Amounts will be displayed in this format
				</Text>
			</View>

			<Modal
				visible={showModal}
				transparent={true}
				animationType="slide"
				onRequestClose={() => setShowModal(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>Select Currency</Text>
						<FlatList
							data={COMMON_CURRENCIES}
							keyExtractor={(item) => item.code}
							renderItem={({ item }) => (
								<TouchableOpacity
									style={[
										styles.currencyItem,
										selectedCurrency === item.code && styles.currencyItemSelected
									]}
									onPress={() => handleCurrencyChange(item.code)}
								>
									<View style={styles.currencyItemContent}>
										<Text style={styles.currencyItemSymbol}>{item.symbol}</Text>
										<View style={styles.currencyItemDetails}>
											<Text style={styles.currencyItemCode}>{item.code}</Text>
											<Text style={styles.currencyItemName}>{item.name}</Text>
										</View>
									</View>
									{selectedCurrency === item.code && <Text style={styles.checkmark}>✓</Text>}
								</TouchableOpacity>
							)}
						/>
						<TouchableOpacity
							style={styles.modalCloseButton}
							onPress={() => setShowModal(false)}
						>
							<Text style={styles.modalCloseText}>Cancel</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
		</View>
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
		marginBottom: 8,
		color: '#000',
	},
	description: {
		fontSize: 14,
		color: '#666',
		marginBottom: 24,
		lineHeight: 20,
	},
	currentCurrencyContainer: {
		marginBottom: 24,
	},
	label: {
		fontSize: 14,
		fontWeight: '600',
		color: '#333',
		marginBottom: 8,
	},
	currencyButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		borderWidth: 2,
		borderColor: '#007AFF',
	},
	currencyInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	currencySymbol: {
		fontSize: 32,
		fontWeight: 'bold',
		marginRight: 16,
		color: '#007AFF',
	},
	currencyDetails: {
		flex: 1,
	},
	currencyCode: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#000',
	},
	currencyName: {
		fontSize: 14,
		color: '#666',
		marginTop: 4,
	},
	arrow: {
		fontSize: 16,
		color: '#007AFF',
	},
	previewContainer: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 20,
		alignItems: 'center',
	},
	previewLabel: {
		fontSize: 12,
		color: '#666',
		marginBottom: 8,
	},
	previewAmount: {
		fontSize: 36,
		fontWeight: 'bold',
		color: '#007AFF',
		marginBottom: 8,
	},
	previewNote: {
		fontSize: 12,
		color: '#999',
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
		width: '85%',
		maxHeight: '80%',
		padding: 20,
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 16,
	},
	currencyItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	currencyItemSelected: {
		backgroundColor: '#f0f8ff',
	},
	currencyItemContent: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	currencyItemSymbol: {
		fontSize: 24,
		fontWeight: 'bold',
		marginRight: 16,
		color: '#007AFF',
		width: 40,
	},
	currencyItemDetails: {
		flex: 1,
	},
	currencyItemCode: {
		fontSize: 16,
		fontWeight: '600',
		color: '#000',
	},
	currencyItemName: {
		fontSize: 14,
		color: '#666',
		marginTop: 2,
	},
	checkmark: {
		fontSize: 20,
		color: '#007AFF',
		fontWeight: 'bold',
	},
	modalCloseButton: {
		marginTop: 16,
		padding: 12,
		backgroundColor: '#f0f0f0',
		borderRadius: 8,
		alignItems: 'center',
	},
	modalCloseText: {
		color: '#333',
		fontWeight: '600',
		fontSize: 16,
	},
	loadingContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		padding: 20,
		marginBottom: 16,
		backgroundColor: '#fff',
		borderRadius: 12,
	},
	loadingText: {
		marginTop: 12,
		color: '#666',
		fontSize: 14,
	},
	currencyButtonDisabled: {
		opacity: 0.5,
	},
});

