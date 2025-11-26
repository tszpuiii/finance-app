import { View } from 'react-native';
import { VictoryPie } from 'victory-native';

export default function BudgetChart({ data }) {
	if (!data || data.length === 0) return null;
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


