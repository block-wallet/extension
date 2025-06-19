import React, { useEffect, createContext, useContext, useCallback } from 'react'
import { useBlankState } from './background/backgroundHooks'
import { setThemePreference } from './commActions'

interface ThemeContextType {
    theme: 'light' | 'dark' | 'system'
    setTheme: (theme: 'light' | 'dark' | 'system') => Promise<void>
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
    const context = useContext(ThemeContext)
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const blankState = useBlankState()
    const theme = blankState?.settings?.theme || 'system'

    // Apply theme class to document
    const applyTheme = useCallback((isDark: boolean) => {
        if (isDark) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [])

    // Determine if dark mode should be active
    const getIsDarkMode = useCallback((themePreference: 'light' | 'dark' | 'system') => {
        if (themePreference === 'system') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches
        }
        return themePreference === 'dark'
    }, [])

    // Set theme preference
    const setTheme = useCallback(async (newTheme: 'light' | 'dark' | 'system') => {
        try {
            await setThemePreference(newTheme)
        } catch (error) {
            console.error('Failed to set theme preference:', error)
        }
    }, [])

    // Apply theme on mount and when it changes
    useEffect(() => {
        const isDark = getIsDarkMode(theme)
        applyTheme(isDark)
    }, [theme, getIsDarkMode, applyTheme])

    // Listen for system theme changes when theme is set to 'system'
    useEffect(() => {
        if (theme !== 'system') return

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

        const handleChange = (e: MediaQueryListEvent) => {
            applyTheme(e.matches)
        }

        // Apply initial theme
        applyTheme(mediaQuery.matches)

        // Add listener
        mediaQuery.addEventListener('change', handleChange)

        // Cleanup
        return () => {
            mediaQuery.removeEventListener('change', handleChange)
        }
    }, [theme, applyTheme])

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}
