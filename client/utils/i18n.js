import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_STORAGE_KEY = '@app_language';

export const LANGUAGES = {
	EN: 'en',
	ZH_TW: 'zh-TW',
	ZH_CN: 'zh-CN',
};

const translations = {
	en: {
		settings: 'Settings',
		account: 'Account',
		email: 'Email',
		userId: 'User ID',
		memberSince: 'Member Since',
		preferences: 'Preferences',
		language: 'Language',
		darkMode: 'Dark Mode',
		darkThemeEnabled: 'Dark theme enabled',
		lightThemeEnabled: 'Light theme enabled',
		actions: 'Actions',
		logout: 'Logout',
		selectLanguage: 'Select Language',
		close: 'Close',
		loadingAccountInfo: 'Loading account information...',
		languageChanged: 'Language Changed',
		restartApp: 'Please restart the app for the changes to take effect.',
		themeChanged: 'Theme Changed',
		logoutConfirm: 'Are you sure you want to logout?',
		cancel: 'Cancel',
		error: 'Error',
		failedToLoad: 'Failed to load user information',
		failedToSave: 'Failed to save setting',
	},
	'zh-TW': {
		settings: '設定',
		account: '帳戶',
		email: '電子郵件',
		userId: '用戶 ID',
		memberSince: '註冊日期',
		preferences: '偏好設定',
		language: '語言',
		darkMode: '深色模式',
		darkThemeEnabled: '已啟用深色主題',
		lightThemeEnabled: '已啟用淺色主題',
		actions: '操作',
		logout: '登出',
		selectLanguage: '選擇語言',
		close: '關閉',
		loadingAccountInfo: '載入帳戶資訊中...',
		languageChanged: '語言已更改',
		restartApp: '請重新啟動應用程式以使更改生效。',
		themeChanged: '主題已更改',
		logoutConfirm: '您確定要登出嗎？',
		cancel: '取消',
		error: '錯誤',
		failedToLoad: '載入用戶資訊失敗',
		failedToSave: '儲存設定失敗',
	},
	'zh-CN': {
		settings: '设置',
		account: '账户',
		email: '电子邮件',
		userId: '用户 ID',
		memberSince: '注册日期',
		preferences: '偏好设置',
		language: '语言',
		darkMode: '深色模式',
		darkThemeEnabled: '已启用深色主题',
		lightThemeEnabled: '已启用浅色主题',
		actions: '操作',
		logout: '登出',
		selectLanguage: '选择语言',
		close: '关闭',
		loadingAccountInfo: '加载账户信息中...',
		languageChanged: '语言已更改',
		restartApp: '请重新启动应用程序以使更改生效。',
		themeChanged: '主题已更改',
		logoutConfirm: '您确定要登出吗？',
		cancel: '取消',
		error: '错误',
		failedToLoad: '加载用户信息失败',
		failedToSave: '保存设置失败',
	},
};

export async function getLanguage() {
	try {
		const language = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
		return language || LANGUAGES.EN;
	} catch (error) {
		return LANGUAGES.EN;
	}
}

export async function setLanguage(language) {
	try {
		await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
		return true;
	} catch (error) {
		return false;
	}
}

export function t(key, language = LANGUAGES.EN) {
	return translations[language]?.[key] || translations[LANGUAGES.EN][key] || key;
}



