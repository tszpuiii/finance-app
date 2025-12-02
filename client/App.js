import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import DashboardScreen from './screens/DashboardScreen';
import AddExpenseScreen from './screens/AddExpenseScreen';
import EditExpenseScreen from './screens/EditExpenseScreen';
import ExpenseDetailScreen from './screens/ExpenseDetailScreen';
import BudgetScreen from './screens/BudgetScreen';
import InsightsScreen from './screens/InsightsScreen';
import CurrencySettingsScreen from './screens/CurrencySettingsScreen';
import CalendarViewScreen from './screens/CalendarViewScreen';
import SettingsScreen from './screens/SettingsScreen';
import NavBar from './components/NavBar';

const Stack = createNativeStackNavigator();

// Wrapper component to add navigation bar
function createScreenWithNavBar(Component) {
	return function WrappedScreen(props) {
		return (
			<View style={styles.screenContainer}>
				<Component {...props} />
				<NavBar />
			</View>
		);
	};
}

export default function App() {
	return (
		<SafeAreaProvider>
			<ThemeProvider>
				<LanguageProvider>
		<NavigationContainer>
			<StatusBar style="auto" />
			<Stack.Navigator>
				<Stack.Screen 
					name="Login" 
					component={LoginScreen} 
					options={{ title: 'Personal Finance Manager' }} 
				/>
				<Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Register' }} />
				<Stack.Screen 
					name="Dashboard" 
					component={createScreenWithNavBar(DashboardScreen)}
					options={{ headerShown: false }}
				/>
				<Stack.Screen 
					name="AddExpense" 
					component={createScreenWithNavBar(AddExpenseScreen)}
					options={{ headerShown: false }}
				/>
				<Stack.Screen 
					name="EditExpense" 
					component={EditExpenseScreen} 
					options={{ title: 'Edit Expense', headerBackVisible: false }} 
				/>
				<Stack.Screen 
					name="ExpenseDetail" 
					component={ExpenseDetailScreen} 
					options={{ title: 'Expense Details', headerBackVisible: false }} 
				/>
				<Stack.Screen 
					name="CalendarView" 
					component={createScreenWithNavBar(CalendarViewScreen)}
					options={{ headerShown: false }}
				/>
				<Stack.Screen 
					name="Budget" 
					component={createScreenWithNavBar(BudgetScreen)}
					options={{ headerShown: false }}
				/>
				<Stack.Screen 
					name="Insights" 
					component={createScreenWithNavBar(InsightsScreen)}
					options={{ headerShown: false }}
				/>
				<Stack.Screen 
					name="CurrencySettings" 
					component={createScreenWithNavBar(CurrencySettingsScreen)}
					options={{ headerShown: false }}
				/>
				<Stack.Screen 
					name="Settings" 
					component={createScreenWithNavBar(SettingsScreen)}
					options={{ headerShown: false }}
				/>
			</Stack.Navigator>
		</NavigationContainer>
			</LanguageProvider>
		</ThemeProvider>
		</SafeAreaProvider>
	);
}

const styles = StyleSheet.create({
	screenContainer: {
		flex: 1,
	},
});
