import { View, Text } from 'react-native';

// 動態導入 VictoryPie，如果不可用則使用降級方案
let VictoryPie = null;
try {
	const victoryNative = require('victory-native');
	if (victoryNative && typeof victoryNative.VictoryPie !== 'undefined') {
		VictoryPie = victoryNative.VictoryPie;
	}
} catch (err) {
	// VictoryPie 不可用，將使用降級方案
	console.warn('VictoryPie not available, using fallback UI');
}

export default function BudgetChart({ data }) {
	if (!data || data.length === 0) {
		return (
			<View style={{ alignItems: 'center', padding: 20 }}>
				<Text style={{ color: '#666' }}>No expense data</Text>
			</View>
		);
	}

	// 如果 VictoryPie 不可用，使用降級方案
	if (!VictoryPie) {
		return (
			<View style={{ padding: 16 }}>
				<Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>Expense Categories</Text>
				{data.map((item, index) => (
					<View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
						<Text style={{ fontSize: 14 }}>{item.category}</Text>
						<Text style={{ fontWeight: 'bold', fontSize: 14 }}>${item.total.toFixed(0)}</Text>
					</View>
				))}
			</View>
		);
	}

	return (
		<View style={{ alignItems: 'center' }}>
			<VictoryPie
				width={320}
				height={260}
				innerRadius={60}
				colorScale="qualitative"
				data={data.map((d) => ({ x: d.category, y: d.total }))}
				labels={({ datum }) => `${datum.x}\n$${datum.y.toFixed(0)}`}
				style={{ labels: { fontSize: 12 } }}
			/>
		</View>
	);
}


