import { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { api } from '../utils/api';
import { saveToken } from '../utils/auth';
import { authenticateWithBiometrics, getBiometricEnabled, isBiometricAvailable, setBiometricEnabled } from '../utils/biometric';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen({ navigation }) {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [biometricReady, setBiometricReady] = useState(false);

	const onLogin = async () => {
		try {
			if (!email || !password) {
				Alert.alert('請輸入帳號與密碼');
				return;
			}
			setLoading(true);
			const { data } = await api.post('/auth/login', { email, password });
			await saveToken(data.token);
			// 第一次成功登入後，若裝置支援，預設開啟生理辨識快速登入
			try {
				if (await isBiometricAvailable()) {
					await setBiometricEnabled(true);
				}
			} catch {}
			navigation.replace('Dashboard');
		} catch (err) {
			Alert.alert('登入失敗', '請檢查帳號或密碼');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		(async () => {
			const available = await isBiometricAvailable();
			const enabled = await getBiometricEnabled();
			const token = await AsyncStorage.getItem('authToken');
			setBiometricReady(available && enabled);
			// 若已啟用且有 token，啟動快速生物辨識
			if (available && enabled && token) {
				const ok = await authenticateWithBiometrics('使用生理辨識快速登入');
				if (ok) {
					navigation.replace('Dashboard');
				}
			}
		})();
	}, [navigation]);

	const onBiometricPress = async () => {
		try {
			const token = await AsyncStorage.getItem('authToken');
			if (!token) {
				Alert.alert('尚未啟用', '請先用帳密登入一次以啟用快速登入');
				return;
			}
			const ok = await authenticateWithBiometrics();
			if (ok) {
				navigation.replace('Dashboard');
			}
		} catch {
			Alert.alert('生理辨識失敗');
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>登入</Text>
			<TextInput
				style={styles.input}
				placeholder="Email"
				autoCapitalize="none"
				keyboardType="email-address"
				value={email}
				onChangeText={setEmail}
			/>
			<TextInput
				style={styles.input}
				placeholder="密碼"
				secureTextEntry
				value={password}
				onChangeText={setPassword}
			/>
			<Button title={loading ? '登入中...' : '登入'} onPress={onLogin} disabled={loading} />
			<View style={{ height: 12 }} />
			{biometricReady ? (
				<Button title="使用生理辨識快速登入" onPress={onBiometricPress} />
			) : null}
			<View style={{ height: 12 }} />
			<Button title="沒有帳號？前往註冊" onPress={() => navigation.navigate('Register')} />
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 24,
		justifyContent: 'center',
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
});


