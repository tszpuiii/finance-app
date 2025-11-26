import { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { api } from '../utils/api';
import { API_BASE_URL } from '../constants/apiUrl';

export default function RegisterScreen({ navigation }) {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);

	const onRegister = async () => {
		try {
			if (!email || !password) {
				Alert.alert('Please enter email and password');
				return;
			}
			setLoading(true);
			await api.post('/auth/register', { email, password });
			Alert.alert('Registration Successful', 'Please login with your new account');
			navigation.replace('Login');
		} catch (err) {
			console.error('註冊錯誤:', err);
			console.error('API URL:', API_BASE_URL);
			
			let errorMessage = 'Registration Failed';
			if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error')) {
				errorMessage = `Unable to connect to server\n\nPlease confirm:\n1. Backend server is running\n2. API URL is correct: ${API_BASE_URL}\n\nFor Android emulator use:\nhttp://10.0.2.2:3000/api\n\nFor real device use computer IP:\nhttp://192.168.x.x:3000/api`;
			} else if (err.response?.data?.error) {
				errorMessage = err.response.data.error;
			} else if (err.message) {
				errorMessage = err.message;
			}
			
			Alert.alert('Registration Failed', errorMessage);
		} finally {
			setLoading(false);
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Create Account</Text>
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
			<Button title={loading ? 'Registering...' : 'Register'} onPress={onRegister} disabled={loading} />
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


