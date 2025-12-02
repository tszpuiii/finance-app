import { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { api } from '../utils/api';
import { authenticateWithBiometrics, getBiometricEnabled, isBiometricAvailable, setBiometricEnabled, getBiometricType } from '../utils/biometric';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';

export default function LoginScreen({ navigation }) {
	const { theme } = useTheme();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [biometricReady, setBiometricReady] = useState(false);
	const [biometricType, setBiometricType] = useState('');
	const [checkingBiometric, setCheckingBiometric] = useState(true);

	const onLogin = async () => {
		try {
			if (!email || !password) {
				Alert.alert('Please enter email and password');
				return;
			}
			setLoading(true);
			
			console.log('=== LOGIN PROCESS STARTED ===');
			console.log('Email:', email);
			
			// Call API
			const { data } = await api.post('/auth/login', { email, password });
			
			if (!data || !data.token) {
				console.error('No token in response');
				Alert.alert('Login Failed', 'No token received from server');
				setLoading(false);
				return;
			}
			
			console.log('Token received, length:', data.token.length);
			
			// Save token - use multiple methods to ensure success
			try {
				await AsyncStorage.setItem('authToken', data.token);
				// Wait for write to complete
				await new Promise(resolve => setTimeout(resolve, 100));
				
				// Verify save
				const saved = await AsyncStorage.getItem('authToken');
				if (saved !== data.token) {
					// Retry save
					console.log('Token verification failed, retrying...');
					await AsyncStorage.setItem('authToken', data.token);
					await new Promise(resolve => setTimeout(resolve, 100));
					const retrySaved = await AsyncStorage.getItem('authToken');
					if (retrySaved !== data.token) {
						throw new Error('Token save failed after retry');
					}
				}
				console.log('Token saved and verified successfully');
			} catch (saveError) {
				console.error('Token save error:', saveError);
				Alert.alert('Error', 'Failed to save login token. Please try again.');
				setLoading(false);
				return;
			}
			
			// Check and enable Face ID (if available)
			let biometricEnabled = false;
			try {
				const available = await isBiometricAvailable();
				if (available) {
					await setBiometricEnabled(true);
					biometricEnabled = true;
					const type = await getBiometricType();
					console.log(`${type} enabled successfully`);
				} else {
					console.log('Biometric not available on this device');
				}
			} catch (biometricError) {
				console.error('Biometric setup error:', biometricError);
				// Don't block login, just log error
			}
			
			// Final state verification
			const finalToken = await AsyncStorage.getItem('authToken');
			const finalBiometricEnabled = await getBiometricEnabled();
			
			console.log('Login completed successfully:', {
				token: finalToken ? `OK (${finalToken.length} chars)` : 'MISSING',
				biometricEnabled: finalBiometricEnabled,
				biometricType: biometricEnabled ? await getBiometricType() : 'N/A'
			});
			
			// Ensure token exists
			if (!finalToken) {
				console.error('CRITICAL: Token missing after all attempts');
				Alert.alert('Error', 'Failed to save login token. Please try again.');
				setLoading(false);
				return;
			}
			
			// Login successful, navigate to Dashboard
			navigation.replace('Dashboard');
		} catch (err) {
			console.error('Login error:', err);
			let errorMessage = 'Please check your email or password';
			
			if (err.response?.status === 401) {
				errorMessage = 'Invalid email or password. Please try again.';
			} else if (err.response?.data?.error) {
				errorMessage = err.response.data.error;
			} else if (err.message) {
				errorMessage = err.message;
			} else if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error')) {
				errorMessage = 'Unable to connect to server. Please check if the backend server is running.';
			}
			
			Alert.alert('Login Failed', errorMessage);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		let isMounted = true;
		
		(async () => {
			try {
				setCheckingBiometric(true);
				
				// Check if device supports biometric authentication
				const available = await isBiometricAvailable();
				if (!isMounted) return;
				
				// Check if enabled
				const enabled = await getBiometricEnabled();
				if (!isMounted) return;
				
				// Check if token exists
				const token = await AsyncStorage.getItem('authToken');
				if (!isMounted) return;
				
				// Get biometric type
				const type = await getBiometricType();
				if (!isMounted) return;
				
				console.log('Biometric status check:', { 
					available, 
					enabled, 
					hasToken: !!token, 
					tokenLength: token ? token.length : 0,
					type 
				});
				
				setBiometricType(type);
				
				// If device supports biometric authentication, show button
				// Show button even if not logged in yet (will prompt to login first when clicked)
				if (available) {
					setBiometricReady(true);
					console.log(`${type} is available, button will be shown`);
					
					if (enabled && token) {
						console.log(`${type} is ready for quick login`);
					} else if (!enabled && token) {
						console.log(`${type} not enabled yet, but token exists`);
					} else if (!token) {
						console.log(`${type} available, but no token - user needs to login first`);
					}
				} else {
					setBiometricReady(false);
					console.log('Biometric authentication not available on this device');
				}
			} catch (error) {
				console.error('Biometric check error:', error);
				if (isMounted) {
					setBiometricReady(false);
				}
			} finally {
				if (isMounted) {
					setCheckingBiometric(false);
				}
			}
		})();
		
		return () => {
			isMounted = false;
		};
	}, [navigation]);

	const onBiometricPress = async () => {
		try {
			console.log('=== BIOMETRIC LOGIN INITIATED ===');
			
			// Step 1: Check token
			let token = await AsyncStorage.getItem('authToken');
			console.log('Step 1 - Token check:', token ? `EXISTS (${token.length} chars)` : 'MISSING');
			
			if (!token) {
				// Retry once
				await new Promise(resolve => setTimeout(resolve, 100));
				token = await AsyncStorage.getItem('authToken');
				console.log('Step 1 - Token retry:', token ? `EXISTS (${token.length} chars)` : 'MISSING');
			}
			
			if (!token) {
				Alert.alert(
					'Login Required',
					'Please login with email and password first. After your first successful login, biometric authentication will be enabled automatically.',
					[{ text: 'OK' }]
				);
				return;
			}
			
			// Step 2: Check device support
			const available = await isBiometricAvailable();
			console.log('Step 2 - Biometric available:', available);
			
			if (!available) {
				Alert.alert(
					'Not Available',
					'Biometric authentication is not available on this device. Please use email and password to login.',
					[{ text: 'OK' }]
				);
				return;
			}
			
			// Step 3: Ensure enabled
			let enabled = await getBiometricEnabled();
			console.log('Step 3 - Biometric enabled:', enabled);
			
			if (!enabled) {
				console.log('Biometric not enabled, enabling now...');
				await setBiometricEnabled(true);
				enabled = await getBiometricEnabled();
				console.log('Step 3 - After enable:', enabled);
			}
			
			// Step 4: Get type
			const type = biometricType || await getBiometricType();
			console.log('Step 4 - Biometric type:', type);
			
			// Step 5: Execute authentication
			console.log('Step 5 - Starting biometric authentication...');
			console.log('Biometric animation should appear now...');
			
			const ok = await authenticateWithBiometrics(`Use ${type} to login`);
			console.log('Step 5 - Authentication result:', ok);
			
			if (ok) {
				// Step 6: Verify token and navigate
				const finalToken = await AsyncStorage.getItem('authToken');
				console.log('Step 6 - Final token check:', finalToken ? 'OK' : 'MISSING');
				
				if (finalToken) {
					console.log('Biometric login successful, navigating to Dashboard');
					navigation.replace('Dashboard');
				} else {
					console.error('Token missing after successful biometric authentication');
					Alert.alert('Error', 'Authentication token is missing. Please login with email and password.');
				}
			} else {
				// Authentication failed or cancelled, handle silently
				console.log('Biometric authentication was cancelled or failed');
				// Don't show error, allow user to continue with email/password login
			}
		} catch (error) {
			console.error('Biometric authentication error:', error);
			// Show different prompts based on error type
			if (error.message?.includes('missing_usage_description')) {
				Alert.alert(
					'Configuration Required',
					'Face ID requires additional configuration. Please use email and password to login, or use a development build to test Face ID.',
					[{ text: 'OK' }]
				);
			} else {
				Alert.alert(
					'Authentication Failed',
					'Biometric authentication failed. Please try again or use email and password to login.',
					[{ text: 'OK' }]
				);
			}
		}
	};

	return (
		<View style={[styles.container, { backgroundColor: theme.background }]}>
			<Text style={[styles.title, { color: theme.text }]}>Login</Text>
			
			{checkingBiometric && (
				<View style={styles.checkingContainer}>
					<ActivityIndicator size="small" color={theme.primary} />
					<Text style={[styles.checkingText, { color: theme.textSecondary }]}>Checking biometric authentication...</Text>
				</View>
			)}
			
			<TextInput
				style={[styles.input, { 
					backgroundColor: theme.surface, 
					borderColor: theme.border, 
					color: theme.text 
				}]}
				placeholder="Email"
				placeholderTextColor={theme.textSecondary}
				autoCapitalize="none"
				keyboardType="email-address"
				value={email}
				onChangeText={setEmail}
			/>
			<TextInput
				style={[styles.input, { 
					backgroundColor: theme.surface, 
					borderColor: theme.border, 
					color: theme.text 
				}]}
				placeholder="Password"
				placeholderTextColor={theme.textSecondary}
				secureTextEntry
				value={password}
				onChangeText={setPassword}
			/>
			
			<TouchableOpacity 
				style={[styles.loginButton, { 
					backgroundColor: theme.primary,
					opacity: loading ? 0.6 : 1
				}]}
				onPress={onLogin} 
				disabled={loading}
			>
				{loading ? (
					<ActivityIndicator color="#fff" />
				) : (
					<Text style={styles.loginButtonText}>Login</Text>
				)}
			</TouchableOpacity>
			
			{biometricReady && !checkingBiometric && biometricType && (
				<>
					<View style={styles.divider}>
						<View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
						<Text style={[styles.dividerText, { color: theme.textSecondary }]}>OR</Text>
						<View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
					</View>
					<TouchableOpacity 
						style={[styles.biometricButton, { 
							backgroundColor: theme.surface,
							borderWidth: 1,
							borderColor: theme.border
						}]}
						onPress={onBiometricPress}
						activeOpacity={0.8}
					>
						<Text style={styles.biometricIcon}>
							{biometricType.includes('Face') ? '👤' : '👆'}
						</Text>
						<Text style={[styles.biometricButtonText, { color: theme.text }]}>
							Login with {biometricType}
						</Text>
					</TouchableOpacity>
				</>
			)}
			
			<TouchableOpacity 
				style={styles.registerButton}
				onPress={() => navigation.navigate('Register')}
			>
				<Text style={[styles.registerButtonText, { color: theme.primary }]}>
					No account? Register
				</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 24,
		justifyContent: 'center',
	},
	title: {
		fontSize: 32,
		fontWeight: 'bold',
		marginBottom: 32,
		textAlign: 'center',
	},
	checkingContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 20,
	},
	checkingText: {
		marginLeft: 8,
		fontSize: 14,
	},
	biometricButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 16,
		borderRadius: 12,
		marginBottom: 16,
		elevation: 1,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
	},
	biometricIcon: {
		fontSize: 24,
		marginRight: 12,
	},
	biometricButtonText: {
		fontSize: 16,
		fontWeight: '600',
	},
	divider: {
		flexDirection: 'row',
		alignItems: 'center',
		marginVertical: 16,
	},
	dividerLine: {
		flex: 1,
		height: 1,
	},
	dividerText: {
		marginHorizontal: 16,
		fontSize: 14,
	},
	input: {
		borderWidth: 1,
		borderRadius: 8,
		padding: 12,
		marginBottom: 12,
		fontSize: 16,
	},
	loginButton: {
		padding: 16,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 8,
		marginBottom: 16,
	},
	loginButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
	},
	registerButton: {
		alignItems: 'center',
		padding: 12,
	},
	registerButtonText: {
		fontSize: 14,
	},
});


