import React, { createContext, useContext, useState, useEffect } from 'react';
import { getTheme, setTheme, THEMES, lightTheme, darkTheme } from '../utils/theme';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
	const [isDarkMode, setIsDarkMode] = useState(false);
	const [theme, setThemeState] = useState(lightTheme);

	useEffect(() => {
		loadTheme();
	}, []);

	async function loadTheme() {
		try {
			const savedTheme = await getTheme();
			const isDark = savedTheme === THEMES.DARK;
			setIsDarkMode(isDark);
			setThemeState(isDark ? darkTheme : lightTheme);
		} catch (error) {
			console.error('Failed to load theme:', error);
		}
	}

	async function toggleTheme(value) {
		try {
			const themeValue = value ? THEMES.DARK : THEMES.LIGHT;
			await setTheme(themeValue);
			setIsDarkMode(value);
			setThemeState(value ? darkTheme : lightTheme);
		} catch (error) {
			console.error('Failed to save theme:', error);
		}
	}

	return (
		<ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme }}>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme() {
	const context = useContext(ThemeContext);
	if (!context) {
		return { theme: lightTheme, isDarkMode: false, toggleTheme: () => {} };
	}
	return context;
}



