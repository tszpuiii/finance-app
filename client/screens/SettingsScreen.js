import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Modal, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../utils/api';
import { clearToken, getToken } from '../utils/auth';
import { clearPendingExpenses } from '../utils/sync';
import { setBiometricEnabled, getBiometricEnabled } from '../utils/biometric';
import { setLanguage, t, LANGUAGES } from '../utils/i18n';
import { setTheme, THEMES, lightTheme, darkTheme } from '../utils/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

const LANGUAGE_OPTIONS = [
	{ code: LANGUAGES.EN, name: 'English', nativeName: 'English' },
	{ code: LANGUAGES.ZH_TW, name: 'Traditional Chinese', nativeName: '繁體中文' },
	{ code: LANGUAGES.ZH_CN, name: 'Simplified Chinese', nativeName: '简体中文' },
];

export default function SettingsScreen() {
	const navigation = useNavigation();
	const { theme, isDarkMode, toggleTheme } = useTheme();
	const insets = useSafeAreaInsets();
	const { language, changeLanguage } = useLanguage();
	const [userInfo, setUserInfo] = useState(null);
	const [showLanguageModal, setShowLanguageModal] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		loadUserInfo();
	}, []);

	useFocusEffect(
		useCallback(() => {
			loadUserInfo();
		}, [])
	);

	async function loadUserInfo() {
		setLoading(true);
		setError(null);
		try {
			const { data } = await api.get('/auth/me');
			if (data) {
				setUserInfo(data);
			} else {
				setError('No user data received');
			}
		} catch (error) {
			console.error('Failed to load user info:', error);
			const errorMessage = error.response?.data?.error || error.message || 'Failed to load user information';
			setError(errorMessage);
			// 如果 API 失敗，嘗試從 token 中獲取基本信息
			try {
				const { getToken } = require('../utils/auth');
				const token = await getToken();
				if (token) {
					// 設置一個基本的用戶信息對象，表示已登錄但無法獲取詳細信息
					setUserInfo({ email: 'Unable to load', id: 'N/A' });
				}
			} catch (err) {
				console.error('Failed to get token:', err);
			}
		} finally {
			setLoading(false);
		}
	}

	async function handleLanguageChange(newLanguage) {
		try {
			await setLanguage(newLanguage);
			changeLanguage(newLanguage);
			setShowLanguageModal(false);
			// 語言已即時更新，無需重啟
		} catch (error) {
			Alert.alert(t('error', language), t('failedToSave', language));
		}
	}

	async function handleThemeToggle(value) {
		await toggleTheme(value);
	}

	async function handleLogout() {
		Alert.alert(
			t('logout', language),
			t('logoutConfirm', language),
			[
				{ text: t('cancel', language), style: 'cancel' },
				{
					text: t('logout', language),
					style: 'destructive',
					onPress: async () => {
						try {
							console.log('Logout started');
							// 清除所有本地數據
							await clearToken();
							await clearPendingExpenses();
							// 清除生理辨識啟用狀態
							await setBiometricEnabled(false);
							
							// 驗證清除是否成功
							const token = await getToken();
							const enabled = await getBiometricEnabled();
							console.log('Logout verification:', {
								token: token ? 'still exists' : 'cleared',
								biometricEnabled: enabled
							});
							
							navigation.reset({
								index: 0,
								routes: [{ name: 'Login' }],
							});
						} catch (error) {
							console.error('Logout error:', error);
							Alert.alert(t('error', language), 'Failed to logout');
						}
					}
				}
			]
		);
	}

	const currentLanguage = LANGUAGE_OPTIONS.find(l => l.code === language) || LANGUAGE_OPTIONS[0];
	const styles = getStyles(theme);

	return (
		<ScrollView 
			style={styles.container}
			contentContainerStyle={{ paddingTop: insets.top }}
		>
			<Text style={styles.title}>{t('settings', language)}</Text>

			{/* Account Information */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>{t('account', language)}</Text>
				<View style={styles.card}>
					{loading && !userInfo && (
						<View style={styles.loadingContainer}>
							<ActivityIndicator size="large" color={theme.primary} />
							<Text style={styles.loadingText}>{t('loadingAccountInfo', language)}</Text>
						</View>
					)}
					{error && !userInfo && (
						<View style={styles.errorContainer}>
							<Text style={styles.errorText}>{error}</Text>
							<TouchableOpacity 
								style={styles.retryButton} 
								onPress={loadUserInfo}
							>
								<Text style={styles.retryButtonText}>Retry</Text>
							</TouchableOpacity>
						</View>
					)}
					{userInfo && !loading && (
						<>
							<View style={styles.infoRow}>
								<Text style={styles.infoLabel}>{t('email', language)}</Text>
								<Text style={styles.infoValue}>{userInfo.email || 'N/A'}</Text>
							</View>
							<View style={styles.infoRow}>
								<Text style={styles.infoLabel}>{t('userId', language)}</Text>
								<Text style={[styles.infoValue, styles.infoValueSmall]}>
									{userInfo.id || userInfo._id || 'N/A'}
								</Text>
							</View>
							{userInfo.createdAt && (
								<View style={[styles.infoRow, styles.infoRowLast]}>
									<Text style={styles.infoLabel}>{t('memberSince', language)}</Text>
									<Text style={styles.infoValue}>
										{new Date(userInfo.createdAt).toLocaleDateString()}
									</Text>
								</View>
							)}
						</>
					)}
				</View>
			</View>

			{/* Preferences */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>{t('preferences', language)}</Text>
				
				{/* Language Setting */}
				<View style={styles.card}>
					<TouchableOpacity 
						style={styles.settingRow}
						onPress={() => setShowLanguageModal(true)}
					>
						<View style={styles.settingLeft}>
							<Text style={styles.settingIcon}>🌐</Text>
							<View>
								<Text style={styles.settingLabel}>{t('language', language)}</Text>
								<Text style={styles.settingSubtext}>{currentLanguage.nativeName}</Text>
							</View>
						</View>
						<Text style={styles.settingArrow}>›</Text>
					</TouchableOpacity>
				</View>

				{/* Dark Mode Toggle */}
				<View style={styles.card}>
					<View style={styles.settingRow}>
						<View style={styles.settingLeft}>
							<Text style={styles.settingIcon}>{isDarkMode ? '🌙' : '☀️'}</Text>
							<View>
								<Text style={styles.settingLabel}>{t('darkMode', language)}</Text>
								<Text style={styles.settingSubtext}>
									{isDarkMode ? t('darkThemeEnabled', language) : t('lightThemeEnabled', language)}
								</Text>
							</View>
						</View>
						<Switch
							value={isDarkMode}
							onValueChange={handleThemeToggle}
							trackColor={{ false: theme.border, true: theme.primary }}
							thumbColor={isDarkMode ? theme.surface : '#f4f3f4'}
						/>
					</View>
				</View>
			</View>

			{/* Actions */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>{t('actions', language)}</Text>
				
				<TouchableOpacity style={[styles.card, styles.logoutButton]} onPress={handleLogout}>
					<Text style={styles.settingIcon}>🚪</Text>
					<Text style={styles.logoutText}>{t('logout', language)}</Text>
					<Text style={styles.settingArrow}>›</Text>
				</TouchableOpacity>
			</View>

			{/* Language Selection Modal */}
			<Modal
				visible={showLanguageModal}
				transparent={true}
				animationType="slide"
				onRequestClose={() => setShowLanguageModal(false)}
			>
				<TouchableOpacity
					style={styles.modalOverlay}
					activeOpacity={1}
					onPress={() => setShowLanguageModal(false)}
				>
					<View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
						<Text style={[styles.modalTitle, { color: theme.text }]}>
							{t('selectLanguage', language)}
						</Text>
						<ScrollView>
							{LANGUAGE_OPTIONS.map((lang) => (
								<TouchableOpacity
									key={lang.code}
									style={[
										styles.languageItem,
										{ borderBottomColor: theme.border },
										language === lang.code && { backgroundColor: theme.primary + '20' }
									]}
									onPress={() => handleLanguageChange(lang.code)}
								>
									<Text style={[
										styles.languageName,
										{ color: theme.text },
										language === lang.code && { color: theme.primary, fontWeight: '600' }
									]}>
										{lang.nativeName}
									</Text>
									<Text style={[
										styles.languageCode,
										{ color: theme.textSecondary },
										language === lang.code && { color: theme.primary }
									]}>
										{lang.name}
									</Text>
									{language === lang.code && (
										<Text style={[styles.checkmark, { color: theme.primary }]}>✓</Text>
									)}
								</TouchableOpacity>
							))}
						</ScrollView>
						<TouchableOpacity
							style={[styles.modalCloseButton, { backgroundColor: theme.primary }]}
							onPress={() => setShowLanguageModal(false)}
						>
							<Text style={styles.modalCloseText}>{t('close', language)}</Text>
						</TouchableOpacity>
					</View>
				</TouchableOpacity>
			</Modal>
		</ScrollView>
	);
}

function getStyles(theme) {
	return StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: theme.background,
			padding: 16,
		},
		title: {
			fontSize: 28,
			fontWeight: 'bold',
			marginBottom: 24,
			color: theme.text,
		},
		section: {
			marginBottom: 24,
		},
		sectionTitle: {
			fontSize: 16,
			fontWeight: '600',
			color: theme.textSecondary,
			marginBottom: 12,
			marginLeft: 4,
		},
		card: {
			backgroundColor: theme.card,
			borderRadius: 12,
			padding: 16,
			marginBottom: 12,
			shadowColor: theme.shadow,
			shadowOffset: { width: 0, height: 1 },
			shadowOpacity: 0.1,
			shadowRadius: 2,
			elevation: 2,
		},
		infoRow: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			paddingVertical: 12,
			borderBottomWidth: 1,
			borderBottomColor: theme.border,
		},
		infoRowLast: {
			borderBottomWidth: 0,
		},
		infoLabel: {
			fontSize: 14,
			color: theme.textSecondary,
			fontWeight: '500',
		},
		infoValue: {
			fontSize: 14,
			color: theme.text,
			fontWeight: '600',
		},
		infoValueSmall: {
			fontSize: 12,
			color: theme.textTertiary,
		},
		loadingContainer: {
			alignItems: 'center',
			justifyContent: 'center',
			padding: 20,
		},
		loadingText: {
			fontSize: 14,
			color: theme.textTertiary,
			fontStyle: 'italic',
			textAlign: 'center',
			marginTop: 12,
		},
		errorContainer: {
			alignItems: 'center',
			justifyContent: 'center',
			padding: 20,
		},
		errorText: {
			fontSize: 14,
			color: theme.error,
			textAlign: 'center',
			marginBottom: 12,
		},
		retryButton: {
			backgroundColor: theme.primary,
			paddingHorizontal: 20,
			paddingVertical: 10,
			borderRadius: 8,
		},
		retryButtonText: {
			color: '#fff',
			fontSize: 14,
			fontWeight: '600',
		},
	settingRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	settingLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	settingIcon: {
		fontSize: 24,
		marginRight: 12,
	},
		settingLabel: {
			fontSize: 16,
			fontWeight: '600',
			color: theme.text,
			marginBottom: 2,
		},
		settingSubtext: {
			fontSize: 12,
			color: theme.textTertiary,
		},
		settingArrow: {
			fontSize: 20,
			color: theme.border,
			marginLeft: 12,
		},
		logoutButton: {
			flexDirection: 'row',
			alignItems: 'center',
			backgroundColor: theme.card,
			borderWidth: 1,
			borderColor: theme.error,
		},
		logoutText: {
			flex: 1,
			fontSize: 16,
			fontWeight: '600',
			color: theme.error,
			marginLeft: 12,
		},
		modalOverlay: {
			flex: 1,
			backgroundColor: 'rgba(0, 0, 0, 0.5)',
			justifyContent: 'flex-end',
		},
		modalContent: {
			borderTopLeftRadius: 20,
			borderTopRightRadius: 20,
			padding: 20,
			maxHeight: '70%',
		},
		modalTitle: {
			fontSize: 20,
			fontWeight: 'bold',
			marginBottom: 20,
		},
		languageItem: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			padding: 16,
			borderBottomWidth: 1,
		},
		languageName: {
			fontSize: 16,
			fontWeight: '500',
			flex: 1,
		},
		languageCode: {
			fontSize: 12,
			marginRight: 12,
		},
		checkmark: {
			fontSize: 18,
			fontWeight: 'bold',
		},
		modalCloseButton: {
			marginTop: 20,
			padding: 16,
			borderRadius: 12,
			alignItems: 'center',
		},
		modalCloseText: {
			color: '#fff',
			fontSize: 16,
			fontWeight: '600',
		},
	});
}

