import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getForecast } from '../services/forecast';
import { VictoryChart, VictoryLine, VictoryTheme } from 'victory-native';
import { fetchExpenses } from '../services/expenses';

export default function InsightsScreen() {
	const [forecast, setForecast] = useState(null);
	const [series, setSeries] = useState([]);

	useEffect(() => {
		(async () => {
			const [f, expenses] = await Promise.all([getForecast(), fetchExpenses()]);
			setForecast(f);
			// 依日期聚合，做簡單趨勢線
			const byDay = new Map();
			for (const e of expenses) {
				const d = new Date(e.date);
				const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
				byDay.set(key, (byDay.get(key) || 0) + Number(e.amount || 0));
			}
			const pts = Array.from(byDay.entries()).map(([k, v]) => ({ x: new Date(k), y: v }));
			pts.sort((a, b) => a.x - b.x);
			setSeries(pts);
		})();
	}, []);

	return (
		<View style={styles.container}>
			<Text style={styles.title}>洞察與預測</Text>
			{forecast ? (
				<Text style={styles.info}>
					{`本月已花費 $${forecast.spent.toFixed(0)}，平均每日 $${forecast.avgPerDay.toFixed(0)}，預估本月合計 $${forecast.forecast.toFixed(0)}`}
				</Text>
			) : null}
			<View style={{ height: 12 }} />
			{series.length > 0 ? (
				<VictoryChart theme={VictoryTheme.material} scale={{ x: 'time' }} height={260} width={360}>
					<VictoryLine data={series} />
				</VictoryChart>
			) : (
				<Text style={{ color: '#666' }}>暫無趨勢資料</Text>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 24 },
	title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
	info: { fontSize: 14, color: '#333' },
});


