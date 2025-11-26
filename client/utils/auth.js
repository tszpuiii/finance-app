import AsyncStorage from '@react-native-async-storage/async-storage';

export async function saveToken(token) {
	await AsyncStorage.setItem('authToken', token);
}

export async function getToken() {
	return AsyncStorage.getItem('authToken');
}

export async function clearToken() {
	await AsyncStorage.removeItem('authToken');
}


