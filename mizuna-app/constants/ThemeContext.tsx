import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';

// Define your theme colors

const lightTheme = {
	background: '#fff',
	text: '#111',
	card: '#fff',
	surface: '#fff',
	border: '#222',
	primary: '#111',
	secondary: '#222',
	accent: '#000',
	warning: '#111',
	error: '#111',
	success: '#111',
	textSecondary: '#555',
	glow: 'none',
};


// Minimal Cyberpunk-like, non-neon dark theme
const darkTheme = {
	background: '#0f0f0f', // Deep metallic black
	text: '#e0e0e0', // Soft metallic white
	card: '#1a1a1a', // Dark metallic gray
	surface: '#1a1a1a', // for surfaces
	border: '#404040', // Metallic silver border
	primary: '#00bfff', // Electric blue
	secondary: '#708090', // Cool slate gray
	accent: '#00ff7f', // Bright green accent
	warning: '#ffa500', // Orange warning
	error: '#dc143c', // Crimson red
	success: '#228b22', // Forest green
	textSecondary: '#a9a9a9', // Dark gray for secondary text
	glow: 'none', // minimal, no glow
	tint: '#00bfff', // Electric blue accent
	tabIconDefault: '#808080', // Metallic gray
	tabIconSelected: '#00bfff', // Electric blue
	shadow: 'rgba(0,0,0,0.8)', // Deep shadow
	highlight: '#1e90ff', // Dodger blue highlight
	inputBackground: '#1a1a1a', // Input fields
	inputBorder: '#404040', // Input border
	overlay: 'rgba(15,15,15,0.9)', // Dark overlay
};

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
	theme: typeof lightTheme;
	isDark: boolean;
	mode: ThemeMode;
	setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
	theme: lightTheme,
	isDark: false,
	mode: 'system',
	setMode: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
	const colorScheme = useColorScheme();
	const [mode, setMode] = useState<ThemeMode>('dark');
	const [darkMode, setDarkMode] = useState(true);

	const isDark = useMemo(() => {
		if (mode === 'system') return colorScheme === 'dark';
		return mode === 'dark';
	}, [mode, colorScheme]);

	const theme = useMemo(() => (isDark ? darkTheme : lightTheme), [isDark]);

	const setThemeMode = useCallback((newMode: ThemeMode) => {
		setMode(newMode);
	}, []);

	return (
		<ThemeContext.Provider value={{ theme, isDark, mode, setMode: setThemeMode }}>
			{children}
		</ThemeContext.Provider>
	);
};

export const useAppTheme = () => useContext(ThemeContext);
