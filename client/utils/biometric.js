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
		
		// Step 1: Check hardware support
		const hasHardware = await LocalAuthentication.hasHardwareAsync();
		console.log('Hardware check:', hasHardware);
		
		if (!hasHardware) {
			console.error('Biometric hardware not available');
			return false;
		}
		
		// Step 2: Check if enrolled
		const isEnrolled = await LocalAuthentication.isEnrolledAsync();
		console.log('Enrollment check:', isEnrolled);
		
		if (!isEnrolled) {
			console.error('Biometric not enrolled on device');
			return false;
		}
		
		// Step 3: Execute authentication
		console.log('Initiating biometric authentication...');
		const result = await LocalAuthentication.authenticateAsync({
			promptMessage,
			cancelLabel: 'Cancel',
			// Disable device fallback, force Face ID/Touch ID
			disableDeviceFallback: true,
			// iOS specific option
			fallbackLabel: 'Use Password',
		});
		
		console.log('Biometric authentication result:', {
			success: result.success,
			error: result.error,
			warning: result.warning,
			cancelled: result.cancelled
		});
		
		// Handle result
		if (result.cancelled) {
			console.log('User cancelled biometric authentication');
			return false;
		}
		
		if (result.error) {
			console.error('Biometric authentication error:', result.error);
			// If configuration error, throw error for caller to handle
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
		// Re-throw configuration error so caller can show appropriate prompt
		if (error.message?.includes('missing_usage_description') || error.message?.includes('NSFaceIDUsageDescription')) {
			throw error;
		}
		// Other errors return false
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


