import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_ENABLED_KEY = 'biometricEnabled';

export async function isBiometricAvailable() {
	const hasHardware = await LocalAuthentication.hasHardwareAsync();
	if (!hasHardware) return false;
	const enrolled = await LocalAuthentication.isEnrolledAsync();
	return enrolled;
}

export async function authenticateWithBiometrics(promptMessage = '請使用生理辨識進行驗證') {
	const result = await LocalAuthentication.authenticateAsync({
		promptMessage,
		cancelLabel: '取消',
		disableDeviceFallback: false,
	});
	return result.success === true;
}

export async function setBiometricEnabled(enabled) {
	await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
}

export async function getBiometricEnabled() {
	const v = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
	return v === 'true';
}


