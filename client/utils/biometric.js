import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_ENABLED_KEY = 'biometricEnabled';

export async function isBiometricAvailable() {
	const hasHardware = await LocalAuthentication.hasHardwareAsync();
	if (!hasHardware) return false;
	const enrolled = await LocalAuthentication.isEnrolledAsync();
	return enrolled;
}

export async function authenticateWithBiometrics(promptMessage = 'Use biometric authentication to verify') {
	try {
		console.log('Starting biometric authentication with message:', promptMessage);
		
		// 步驟 1: 檢查硬件支持
		const hasHardware = await LocalAuthentication.hasHardwareAsync();
		console.log('Hardware check:', hasHardware);
		
		if (!hasHardware) {
			console.error('Biometric hardware not available');
			return false;
		}
		
		// 步驟 2: 檢查是否已設置
		const isEnrolled = await LocalAuthentication.isEnrolledAsync();
		console.log('Enrollment check:', isEnrolled);
		
		if (!isEnrolled) {
			console.error('Biometric not enrolled on device');
			return false;
		}
		
		// 步驟 3: 執行認證
		console.log('Initiating biometric authentication...');
		const result = await LocalAuthentication.authenticateAsync({
			promptMessage,
			cancelLabel: 'Cancel',
			// 禁用設備回退，強制使用 Face ID/Touch ID
			disableDeviceFallback: true,
			// iOS 特定選項
			fallbackLabel: 'Use Password',
		});
		
		console.log('Biometric authentication result:', {
			success: result.success,
			error: result.error,
			warning: result.warning,
			cancelled: result.cancelled
		});
		
		// 處理結果
		if (result.cancelled) {
			console.log('User cancelled biometric authentication');
			return false;
		}
		
		if (result.error) {
			console.error('Biometric authentication error:', result.error);
			// 如果是配置錯誤，拋出錯誤讓調用者處理
			if (result.error === 'missing_usage_description') {
				throw new Error('Face ID configuration missing. Please use development build or configure NSFaceIDUsageDescription.');
			}
			return false;
		}
		
		if (result.warning) {
			console.warn('Biometric authentication warning:', result.warning);
		}
		
		return result.success === true;
	} catch (error) {
		console.error('Biometric authentication exception:', error);
		// 重新拋出配置錯誤，讓調用者可以顯示適當的提示
		if (error.message?.includes('missing_usage_description') || error.message?.includes('NSFaceIDUsageDescription')) {
			throw error;
		}
		// 其他錯誤返回 false
		return false;
	}
}

export async function setBiometricEnabled(enabled) {
	await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
}

export async function getBiometricEnabled() {
	const v = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
	return v === 'true';
}

export async function getBiometricType() {
	try {
		const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
		if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
			return 'Face ID';
		} else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
			return 'Touch ID / Fingerprint';
		} else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
			return 'Iris';
		}
		return 'Biometric';
	} catch (error) {
		return 'Biometric';
	}
}


