import { api } from '../utils/api';

export async function getForecast() {
	const { data } = await api.get('/forecast');
	return data;
}


