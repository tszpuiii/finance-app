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
				Alert.alert('Please enter email and password');
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
			Alert.alert('Login Failed', 'Please check your email or password');
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
				const ok = await authenticateWithBiometrics('Use biometric authentication to login');
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
				Alert.alert('Not Enabled', 'Please login with email and password first to enable quick login');
				return;
			}
			const ok = await authenticateWithBiometrics();
			if (ok) {
				navigation.replace('Dashboard');
			}
		} catch {
			Alert.alert('Biometric Authentication Failed');
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Login</Text>
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
				placeholder="Password"
				secureTextEntry
				value={password}
				onChangeText={setPassword}
			/>
			<Button title={loading ? 'Logging in...' : 'Login'} onPress={onLogin} disabled={loading} />
			<View style={{ height: 12 }} />
			{biometricReady ? (
				<Button title="Quick Login with Biometrics" onPress={onBiometricPress} />
			) : null}
			<View style={{ height: 12 }} />
			<Button title="No account? Register" onPress={() => navigation.navigate('Register')} />
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


