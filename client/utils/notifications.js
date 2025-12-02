import Constants from 'expo-constants';

// 檢查是否在 Expo Go 中運行
const isExpoGo = Constants.executionEnvironment === 'storeClient';

// 動態導入，避免在 Expo Go 中觸發推送通知警告
let Notifications = null;
if (!isExpoGo) {
	try {
		Notifications = require('expo-notifications');
	} catch (error) {
		console.warn('expo-notifications not available');
	}
}

export async function ensureNotificationPermission() {
	if (!Notifications || isExpoGo) {
		return false;
	}
	try {
		const settings = await Notifications.getPermissionsAsync();
		if (settings.granted) return true;
		const req = await Notifications.requestPermissionsAsync();
		return req.granted === true;
	} catch (error) {
		console.warn('Notification permission request failed:', error.message);
		return false;
	}
}

export async function notify(title, body) {
	// 在 Expo Go 中完全跳過通知功能，避免警告
	if (isExpoGo || !Notifications) {
		return;
	}
	try {
		await ensureNotificationPermission();
		await Notifications.scheduleNotificationAsync({
			content: { title, body },
			trigger: null,
		});
	} catch (error) {
		// 靜默失敗，不影響應用功能
		console.warn('Notification error (ignored):', error.message);
	}
}


