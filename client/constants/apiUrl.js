import { Platform } from 'react-native';

// Auto-detect platform and set default API URL
function getDefaultApiUrl() {
	// If environment variable is explicitly set, use it first
	if (process.env.EXPO_PUBLIC_API_URL) {
		return process.env.EXPO_PUBLIC_API_URL;
	}

	// Set default value based on platform
	if (Platform.OS === 'android') {
		// Android emulator uses 10.0.2.2 to access host localhost
		// Real device needs to set environment variable to use computer IP
		return 'http://10.0.2.2:3000/api';
	} else if (Platform.OS === 'ios') {
		// iOS simulator can use localhost
		return 'http://localhost:3000/api';
	} else {
		// Web or other platforms
		return 'http://localhost:3000/api';
	}
}

export const API_BASE_URL = getDefaultApiUrl();


