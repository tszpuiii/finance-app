import * as Notifications from 'expo-notifications';

export async function ensureNotificationPermission() {
	const settings = await Notifications.getPermissionsAsync();
	if (settings.granted) return true;
	const req = await Notifications.requestPermissionsAsync();
	return req.granted === true;
}

export async function notify(title, body) {
	try {
		await ensureNotificationPermission();
		await Notifications.scheduleNotificationAsync({
			content: { title, body },
			trigger: null,
		});
	} catch {
		// 忽略通知錯誤
	}
}


