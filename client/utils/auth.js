import AsyncStorage from '@react-native-async-storage/async-storage';

export async function saveToken(token) {
	try {
		if (!token) {
			console.error('Cannot save empty token');
			throw new Error('Token is required');
		}
		
		console.log('Saving token, length:', token.length);
		await AsyncStorage.setItem('authToken', token);
		
		// Wait a bit to ensure write completes
		await new Promise(resolve => setTimeout(resolve, 50));
		
		// Verify save was successful
		const saved = await AsyncStorage.getItem('authToken');
		if (saved === token) {
			console.log('Token saved and verified successfully');
		} else {
			console.error('Token verification failed:', {
				expected: token.substring(0, 20) + '...',
				got: saved ? saved.substring(0, 20) + '...' : 'null'
			});
			throw new Error('Token verification failed');
		}
	} catch (error) {
		console.error('Error saving token:', error);
		throw error;
	}
}

export async function getToken() {
	try {
		const token = await AsyncStorage.getItem('authToken');
		// Reduce log output, only log at critical moments
		// console.log('Token retrieved:', token ? `exists (length: ${token.length})` : 'missing');
		return token;
	} catch (error) {
		console.error('Error getting token:', error);
		return null;
	}
}

export async function clearToken() {
	try {
		await AsyncStorage.removeItem('authToken');
		console.log('Token cleared');
		// Verify clear was successful
		const token = await AsyncStorage.getItem('authToken');
		if (!token) {
			console.log('Token clear verification: OK');
		} else {
			console.error('Token clear verification failed: token still exists');
		}
	} catch (error) {
		console.error('Error clearing token:', error);
		throw error;
	}
}


