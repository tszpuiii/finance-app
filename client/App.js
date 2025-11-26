import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import DashboardScreen from './screens/DashboardScreen';
import AddExpenseScreen from './screens/AddExpenseScreen';
import BudgetScreen from './screens/BudgetScreen';
import InsightsScreen from './screens/InsightsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
	return (
		<NavigationContainer>
			<StatusBar style="auto" />
			<Stack.Navigator>
				<Stack.Screen name="Login" component={LoginScreen} />
				<Stack.Screen name="Register" component={RegisterScreen} options={{ title: '註冊' }} />
				<Stack.Screen name="Dashboard" component={DashboardScreen} />
				<Stack.Screen name="AddExpense" component={AddExpenseScreen} options={{ title: '新增支出' }} />
				<Stack.Screen name="Budget" component={BudgetScreen} options={{ title: '預算設定' }} />
				<Stack.Screen name="Insights" component={InsightsScreen} options={{ title: '洞察' }} />
			</Stack.Navigator>
		</NavigationContainer>
	);
}
