import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';

export default function NavBar() {
	const navigation = useNavigation();
	const route = useRoute();
	const { theme, isDarkMode } = useTheme();

	// 定義不需要顯示導航欄的頁面
	const hideNavBarRoutes = ['Login', 'Register', 'EditExpense', 'ExpenseDetail', 'CurrencySettings'];
	if (hideNavBarRoutes.includes(route.name)) {
		return null;
	}

	const navItems = [
		{ name: 'Dashboard', icon: '🏠', label: 'Home' },
		{ name: 'CalendarView', icon: '📅', label: 'Calendar' },
		{ name: 'AddExpense', icon: '➕', label: 'Add' },
		{ name: 'Insights', icon: '📊', label: 'Insights' },
		{ name: 'Settings', icon: '⚙️', label: 'Settings' },
	];

	function handleNavigate(screenName) {
		if (route.name !== screenName) {
			navigation.navigate(screenName);
		}
	}

	const styles = getStyles(theme, isDarkMode);

	return (
		<View style={styles.container}>
			{navItems.map((item) => {
				const isActive = route.name === item.name;
				return (
					<TouchableOpacity
						key={item.name}
						style={[styles.navItem, isActive && styles.navItemActive]}
						onPress={() => handleNavigate(item.name)}
						activeOpacity={0.7}
					>
						<Text style={[styles.navIcon, isActive && styles.navIconActive]}>
							{item.icon}
						</Text>
						<Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
							{item.label}
						</Text>
					</TouchableOpacity>
				);
			})}
		</View>
	);
}

function getStyles(theme, isDarkMode) {
	return StyleSheet.create({
		container: {
			flexDirection: 'row',
			backgroundColor: theme.card,
			borderTopWidth: 1,
			borderTopColor: theme.border,
			paddingVertical: 8,
			paddingBottom: 20,
			shadowColor: '#000',
			shadowOffset: { width: 0, height: -2 },
			shadowOpacity: isDarkMode ? 0.3 : 0.1,
			shadowRadius: 4,
			elevation: 5,
			justifyContent: 'space-around',
			alignItems: 'center',
		},
		navItem: {
			flex: 1,
			alignItems: 'center',
			justifyContent: 'center',
			paddingVertical: 8,
		},
		navItemActive: {
			backgroundColor: theme.primary + '20',
			borderRadius: 12,
			marginHorizontal: 4,
		},
		navIcon: {
			fontSize: 24,
			marginBottom: 4,
		},
		navIconActive: {
			transform: [{ scale: 1.1 }],
		},
		navLabel: {
			fontSize: 11,
			color: theme.textSecondary,
			fontWeight: '500',
		},
		navLabelActive: {
			color: theme.primary,
			fontWeight: '600',
		},
	});
}

