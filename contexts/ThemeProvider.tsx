import React, { useState, useEffect, ReactNode } from 'react';
import { ThemeContext, Theme } from './ThemeContext.ts';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        try {
            const storedTheme = window.localStorage.getItem('theme');
            return (storedTheme as Theme) || 'system';
        } catch (error) {
            console.error("Could not read theme from localStorage", error);
            return 'system';
        }
    });

    useEffect(() => {
        const root = window.document.documentElement;
        const isDark =
            theme === 'dark' ||
            (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

        root.classList.toggle('dark', isDark);
        
        try {
            window.localStorage.setItem('theme', theme);
        } catch (error) {
            console.error("Could not save theme to localStorage", error);
        }
    }, [theme]);
    
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const handleChange = () => {
            if (theme === 'system') {
                const root = window.document.documentElement;
                root.classList.toggle('dark', mediaQuery.matches);
            }
        };
        
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);


    const value = {
        theme,
        setTheme,
    };

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
