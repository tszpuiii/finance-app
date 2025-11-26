import { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { convertCurrency, COMMON_CURRENCIES } from '../services/currency';

export default function CurrencyConverter({ amount, onConvert }) {
	const [fromCurrency, setFromCurrency] = useState('USD');
	const [toCurrency, setToCurrency] = useState('USD');
	const [convertedAmount, setConvertedAmount] = useState(null);
	const [loading, setLoading] = useState(false);
	const [showFromModal, setShowFromModal] = useState(false);
	const [showToModal, setShowToModal] = useState(false);

	useEffect(() => {
		if (amount && fromCurrency && toCurrency && fromCurrency !== toCurrency) {
			performConversion();
		} else if (fromCurrency === toCurrency) {
			setConvertedAmount(parseFloat(amount) || 0);
		}
	}, [amount, fromCurrency, toCurrency]);

	async function performConversion() {
		if (!amount || parseFloat(amount) <= 0) {
			setConvertedAmount(null);
			return;
		}

		setLoading(true);
		try {
			const result = await convertCurrency(amount, fromCurrency, toCurrency);
			setConvertedAmount(result.result);
			if (onConvert) {
				onConvert(result.result, toCurrency);
			}
		} catch (err) {
			console.error('Conversion error:', err);
			setConvertedAmount(null);
		} finally {
			setLoading(false);
		}
	}

	function getCurrencySymbol(code) {
		const currency = COMMON_CURRENCIES.find(c => c.code === code);
		return currency?.symbol || code;
	}

	function getCurrencyName(code) {
		const currency = COMMON_CURRENCIES.find(c => c.code === code);
		return currency?.name || code;
	}

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Currency Converter</Text>
			
			{amount && parseFloat(amount) > 0 ? (
				<View style={styles.inputRow}>
					<View style={styles.amountContainer}>
						<Text style={styles.label}>Amount</Text>
						<Text style={styles.amount}>
							{getCurrencySymbol(fromCurrency)} {parseFloat(amount || 0).toFixed(2)}
						</Text>
					</View>
				</View>
			) : (
				<View style={styles.inputRow}>
					<View style={styles.amountContainer}>
						<Text style={styles.label}>Enter amount above to convert</Text>
						<Text style={styles.amountPlaceholder}>$0.00</Text>
					</View>
				</View>
			)}

			<View style={styles.currencyRow}>
				<TouchableOpacity
					style={styles.currencyButton}
					onPress={() => setShowFromModal(true)}
				>
					<Text style={styles.currencyCode}>{fromCurrency}</Text>
					<Text style={styles.currencyName}>{getCurrencyName(fromCurrency)}</Text>
				</TouchableOpacity>

				<Text style={styles.arrow}>→</Text>

				<TouchableOpacity
					style={styles.currencyButton}
					onPress={() => setShowToModal(true)}
				>
					<Text style={styles.currencyCode}>{toCurrency}</Text>
					<Text style={styles.currencyName}>{getCurrencyName(toCurrency)}</Text>
				</TouchableOpacity>
			</View>

			{convertedAmount !== null && (
				<View style={styles.resultContainer}>
					<Text style={styles.resultLabel}>Converted Amount</Text>
					<Text style={styles.resultAmount}>
						{getCurrencySymbol(toCurrency)} {convertedAmount.toFixed(2)}
					</Text>
				</View>
			)}

			{loading && <Text style={styles.loading}>Converting...</Text>}

			{/* From Currency Modal */}
			<Modal
				visible={showFromModal}
				transparent={true}
				animationType="slide"
				onRequestClose={() => setShowFromModal(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>Select From Currency</Text>
						<FlatList
							data={COMMON_CURRENCIES}
							keyExtractor={(item) => item.code}
							renderItem={({ item }) => (
								<TouchableOpacity
									style={[
										styles.currencyItem,
										fromCurrency === item.code && styles.currencyItemSelected
									]}
									onPress={() => {
										setFromCurrency(item.code);
										setShowFromModal(false);
									}}
								>
									<Text style={styles.currencyItemText}>
										{item.code} - {item.name}
									</Text>
									{fromCurrency === item.code && <Text style={styles.checkmark}>✓</Text>}
								</TouchableOpacity>
							)}
						/>
						<TouchableOpacity
							style={styles.modalCloseButton}
							onPress={() => setShowFromModal(false)}
						>
							<Text style={styles.modalCloseText}>Close</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>

			{/* To Currency Modal */}
			<Modal
				visible={showToModal}
				transparent={true}
				animationType="slide"
				onRequestClose={() => setShowToModal(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>Select To Currency</Text>
						<FlatList
							data={COMMON_CURRENCIES}
							keyExtractor={(item) => item.code}
							renderItem={({ item }) => (
								<TouchableOpacity
									style={[
										styles.currencyItem,
										toCurrency === item.code && styles.currencyItemSelected
									]}
									onPress={() => {
										setToCurrency(item.code);
										setShowToModal(false);
									}}
								>
									<Text style={styles.currencyItemText}>
										{item.code} - {item.name}
									</Text>
									{toCurrency === item.code && <Text style={styles.checkmark}>✓</Text>}
								</TouchableOpacity>
							)}
						/>
						<TouchableOpacity
							style={styles.modalCloseButton}
							onPress={() => setShowToModal(false)}
						>
							<Text style={styles.modalCloseText}>Close</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	title: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 16,
		color: '#000',
	},
	inputRow: {
		marginBottom: 16,
	},
	amountContainer: {
		alignItems: 'center',
	},
	label: {
		fontSize: 12,
		color: '#666',
		marginBottom: 4,
	},
	amount: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#000',
	},
	currencyRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 16,
	},
	currencyButton: {
		flex: 1,
		backgroundColor: '#f5f5f5',
		borderRadius: 8,
		padding: 12,
		alignItems: 'center',
	},
	currencyCode: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#000',
	},
	currencyName: {
		fontSize: 12,
		color: '#666',
		marginTop: 4,
	},
	amountPlaceholder: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#ccc',
	},
	arrow: {
		fontSize: 24,
		marginHorizontal: 12,
		color: '#007AFF',
	},
	resultContainer: {
		backgroundColor: '#f0f8ff',
		borderRadius: 8,
		padding: 16,
		alignItems: 'center',
	},
	resultLabel: {
		fontSize: 12,
		color: '#666',
		marginBottom: 4,
	},
	resultAmount: {
		fontSize: 28,
		fontWeight: 'bold',
		color: '#007AFF',
	},
	loading: {
		textAlign: 'center',
		color: '#666',
		marginTop: 8,
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
	currencyItemText: {
		fontSize: 16,
		color: '#000',
	},
	checkmark: {
		fontSize: 18,
		color: '#007AFF',
		fontWeight: 'bold',
	},
	modalCloseButton: {
		marginTop: 16,
		padding: 12,
		backgroundColor: '#007AFF',
		borderRadius: 8,
		alignItems: 'center',
	},
	modalCloseText: {
		color: '#fff',
		fontWeight: '600',
		fontSize: 16,
	},
});

