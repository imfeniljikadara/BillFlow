import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeColors = {
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    primary: string;
    primaryLight: string;
    secondary: string;
    border: string;
    inputBg: string;
    success: string;
    error: string;
    warning: string;
    surface: string;
    accent: string;
};

type ThemeContextType = {
    isDark: boolean;
    toggleTheme: () => void;
    colors: ThemeColors;
};

const lightColors: ThemeColors = {
    background: '#F8F9FE', // Softer background
    card: '#FFFFFF',
    surface: '#F1F5F9',
    text: '#0F172A', // Deeper slate
    textSecondary: '#64748B',
    primary: '#4F46E5', // Indigo
    primaryLight: '#E0E7FF',
    secondary: '#8B5CF6', // Violet
    accent: '#F43F5E', // Rose
    border: '#E2E8F0',
    inputBg: '#FFFFFF',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
};

const darkColors: ThemeColors = {
    background: '#020617', // Deep navy black
    card: '#0F172A',
    surface: '#1E293B',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    primary: '#6366F1', // Vibrate indigo
    primaryLight: 'rgba(99, 102, 241, 0.15)',
    secondary: '#A78BFA',
    accent: '#FB7185',
    border: '#1E293B',
    inputBg: '#1E293B',
    success: '#34D399',
    error: '#F87171',
    warning: '#FBBF24',
};

const ThemeContext = createContext<ThemeContextType>({
    isDark: false,
    toggleTheme: () => { },
    colors: lightColors,
});

export const useTheme = () => useContext(ThemeContext);

type Props = {
    children: ReactNode;
};

export const ThemeProvider = ({ children }: Props) => {
    const systemColorScheme = useColorScheme();
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem('theme');
            if (savedTheme !== null) {
                setIsDark(savedTheme === 'dark');
            } else {
                setIsDark(systemColorScheme === 'dark');
            }
        } catch (e) {
            console.error('Failed to load theme', e);
        }
    };

    const toggleTheme = async () => {
        try {
            const newTheme = !isDark;
            setIsDark(newTheme);
            await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
        } catch (e) {
            console.error('Failed to save theme', e);
        }
    };

    const colors = isDark ? darkColors : lightColors;

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
            {children}
        </ThemeContext.Provider>
    );
};
