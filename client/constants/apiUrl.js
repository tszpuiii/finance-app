// 若有設定 EXPO_PUBLIC_API_URL 則優先使用，否則預設本機
export const API_BASE_URL =
	(process.env.EXPO_PUBLIC_API_URL && `${process.env.EXPO_PUBLIC_API_URL}`) || 'http://localhost:3000/api';


