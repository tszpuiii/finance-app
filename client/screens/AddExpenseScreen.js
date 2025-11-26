import { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { api } from '../utils/api';
import * as Location from 'expo-location';
import { queueExpense } from '../utils/sync';
import { notify } from '../utils/notifications';

export default function AddExpenseScreen({ navigation }) {
	const [amount, setAmount] = useState('');
	const [category, setCategory] = useState('');
	const [loading, setLoading] = useState(false);
	const [coords, setCoords] = useState(null);
	const [placeName, setPlaceName] = useState('');

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

	useEffect(() => {
		(async () => {
			try {
				const { status } = await Location.requestForegroundPermissionsAsync();
				if (status !== 'granted') return;
				const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
				setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
				const geos = await Location.reverseGeocodeAsync({
					latitude: pos.coords.latitude,
					longitude: pos.coords.longitude,
				});
				if (geos && geos.length > 0) {
					const g = geos[0];
					const name = [g.name, g.street, g.city].filter(Boolean).join(' ');
					setPlaceName(name);
					const guess = inferCategoryFromPlace(name);
					if (guess && !category) setCategory(guess);
				}
			} catch {
				// 忽略定位錯誤，維持手動輸入流程
			}
		})();
	}, [category]);

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
		<View style={styles.container}>
			<Text style={styles.title}>Add Expense</Text>
			<TextInput
				style={styles.input}
				placeholder="Amount (e.g. 120)"
				keyboardType="numeric"
				value={amount}
				onChangeText={setAmount}
			/>
			<TextInput
				style={styles.input}
				placeholder="Category (e.g. Food)"
				value={category}
				onChangeText={setCategory}
			/>
			{placeName ? <Text style={styles.hint}>Detected location: {placeName}</Text> : null}
			<Button title={loading ? 'Saving...' : 'Save'} onPress={onSave} disabled={loading} />
		</View>
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
	hint: { color: '#666', marginBottom: 12 },
});


