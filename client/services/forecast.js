import { api } from '../utils/api';

export async function getForecast() {
	// 添加時間戳避免緩存
	const { data } = await api.get('/forecast', {
		params: { _t: Date.now() }
	});
	return data;
}


