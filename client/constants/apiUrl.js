import { Platform } from 'react-native';

// 自動檢測平台並設置默認 API URL
function getDefaultApiUrl() {
	// 如果明確設置了環境變量，優先使用
	if (process.env.EXPO_PUBLIC_API_URL) {
		return process.env.EXPO_PUBLIC_API_URL;
	}

	// 根據平台設置默認值
	if (Platform.OS === 'android') {
		// Android 模擬器使用 10.0.2.2 訪問主機 localhost
		// 真機需要設置環境變量使用電腦 IP
		return 'http://10.0.2.2:3000/api';
	} else if (Platform.OS === 'ios') {
		// iOS 模擬器可以使用 localhost
		return 'http://localhost:3000/api';
	} else {
		// Web 或其他平台
		return 'http://localhost:3000/api';
	}
}

export const API_BASE_URL = getDefaultApiUrl();


