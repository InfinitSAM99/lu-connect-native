import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Appearance } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  actualTheme: 'light' | 'dark';
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('dark');
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    AsyncStorage.getItem('lu-theme').then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setThemeState(stored);
      }
    });
  }, []);

  useEffect(() => {
    const apply = (mode: ThemeMode) => {
      if (mode === 'system') {
        const systemColor = Appearance.getColorScheme();
        setActualTheme(systemColor === 'light' ? 'light' : 'dark');
      } else {
        setActualTheme(mode);
      }
    };
    apply(theme);

    const listener = Appearance.addChangeListener(({ colorScheme }) => {
      if (theme === 'system') {
        setActualTheme(colorScheme === 'light' ? 'light' : 'dark');
      }
    });
    return () => listener.remove();
  }, [theme]);

  const setTheme = (t: ThemeMode) => {
    AsyncStorage.setItem('lu-theme', t);
    setThemeState(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, actualTheme }}>
      <StatusBar style={actualTheme === 'dark' ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
