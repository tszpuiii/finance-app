import { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { api } from '../utils/api';

export default function RegisterScreen({ navigation }) {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);

	const onRegister = async () => {
		try {
			if (!email || !password) {
				Alert.alert('請輸入 email 與密碼');
				return;
			}
			setLoading(true);
			await api.post('/auth/register', { email, password });
			Alert.alert('註冊成功', '請使用新帳號登入');
			navigation.replace('Login');
		} catch (err) {
			Alert.alert('註冊失敗', 'Email 可能已存在或伺服器錯誤');
		} finally {
			setLoading(false);
		}
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>建立帳號</Text>
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
			<Button title={loading ? '註冊中...' : '註冊'} onPress={onRegister} disabled={loading} />
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


