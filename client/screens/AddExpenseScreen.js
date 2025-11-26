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
		if (t.includes('starbucks') || t.includes('cafe') || t.includes('coffee') || t.includes('餐') || t.includes('飲')) {
			return '飲食';
		}
		if (t.includes('7-eleven') || t.includes('便利') || t.includes('store')) {
			return '購物';
		}
		if (t.includes('station') || t.includes('mtr') || t.includes('bus') || t.includes('地鐵') || t.includes('車站')) {
			return '交通';
		}
		if (t.includes('market') || t.includes('mall') || t.includes('plaza') || t.includes('超市')) {
			return '購物';
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
				Alert.alert('請填寫金額與類別');
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
					const title = a.type === 'budget_exceeded' ? '預算已超過' : '預算警告';
					const body = `${a.category} 已達 ${a.percent}%（$${a.spent} / $${a.limit}）`;
					notify(title, body);
				}
				Alert.alert('已儲存');
			} catch {
				await queueExpense(payload);
				Alert.alert('離線儲存', '已加入待同步佇列');
			}
			navigation.goBack();
		} catch (err) {
			Alert.alert('儲存失敗', '請確認登入狀態或伺服器連線');
		} finally {
			setLoading(false);
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>新增支出</Text>
			<TextInput
				style={styles.input}
				placeholder="金額 (如 120)"
				keyboardType="numeric"
				value={amount}
				onChangeText={setAmount}
			/>
			<TextInput
				style={styles.input}
				placeholder="類別 (如 食物)"
				value={category}
				onChangeText={setCategory}
			/>
			{placeName ? <Text style={styles.hint}>偵測地點：{placeName}</Text> : null}
			<Button title={loading ? '儲存中...' : '儲存'} onPress={onSave} disabled={loading} />
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


