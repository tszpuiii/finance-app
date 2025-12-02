import React, { createContext, useContext, useState, useEffect } from 'react';
import { getLanguage, LANGUAGES } from '../utils/i18n';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
	const [language, setLanguageState] = useState(LANGUAGES.EN);

	useEffect(() => {
		loadLanguage();
	}, []);

	async function loadLanguage() {
		try {
			const savedLanguage = await getLanguage();
			setLanguageState(savedLanguage);
		} catch (error) {
			console.error('Failed to load language:', error);
		}
	}

	function changeLanguage(newLanguage) {
		setLanguageState(newLanguage);
	}

	return (
		<LanguageContext.Provider value={{ language, changeLanguage }}>
			{children}
		</LanguageContext.Provider>
	);
}

export function useLanguage() {
	const context = useContext(LanguageContext);
	if (!context) {
		return { language: LANGUAGES.EN, changeLanguage: () => {} };
	}
	return context;
}



