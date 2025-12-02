import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = '@app_theme';

export const THEMES = {
	LIGHT: 'light',
	DARK: 'dark',
};

export async function getTheme() {
	try {
		const theme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
		return theme || THEMES.LIGHT;
	} catch (error) {
		return THEMES.LIGHT;
	}
}

export async function setTheme(theme) {
	try {
		await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
		return true;
	} catch (error) {
		return false;
	}
}

export const lightTheme = {
	background: '#f5f5f5',
	surface: '#ffffff',
	text: '#333333',
	textSecondary: '#666666',
	textTertiary: '#999999',
	border: '#e0e0e0',
	primary: '#007AFF',
	primaryDark: '#0051D5',
	error: '#FF3B30',
	success: '#34C759',
	warning: '#FF9500',
	card: '#ffffff',
	shadow: 'rgba(0, 0, 0, 0.1)',
};

export const darkTheme = {
	background: '#000000',
	surface: '#1C1C1E',
	text: '#FFFFFF',
	textSecondary: '#EBEBF5',
	textTertiary: '#8E8E93',
	border: '#38383A',
	primary: '#0A84FF',
	primaryDark: '#0051D5',
	error: '#FF453A',
	success: '#32D74B',
	warning: '#FF9F0A',
	card: '#2C2C2E',
	shadow: 'rgba(0, 0, 0, 0.3)',
};



