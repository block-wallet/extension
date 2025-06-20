import React from "react"
import { useHistory } from "react-router-dom"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import { useTheme } from "../../context/ThemeProvider"
import { classnames } from "../../styles"

const ThemePreferencesPage = () => {
    const history = useHistory()
    const { theme, setTheme } = useTheme()

    // Simple icon components
    const SunIcon = () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    )

    const MoonIcon = () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
    )

    const DesktopIcon = () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
    )

    const themeOptions = [
        {
            value: 'light' as const,
            label: 'Light',
            description: 'Always use light theme',
            icon: <SunIcon />,
            preview: "bg-white text-gray-900 border-gray-200"
        },
        {
            value: 'dark' as const,
            label: 'Dark',
            description: 'Always use dark theme',
            icon: <MoonIcon />,
            preview: "bg-gray-900 text-gray-100 border-gray-700"
        },
        {
            value: 'system' as const,
            label: 'System',
            description: 'Follow system preference',
            icon: <DesktopIcon />,
            preview: "bg-gradient-to-r from-white to-gray-900 text-gray-700 border-gray-400"
        }
    ]

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Theme"
                    close="/"
                    onBack={() => {
                        history.goBack()
                    }}
                />
            }
        >
            <div className="flex flex-col p-6 space-y-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Choose your preferred theme for the wallet interface
                </div>

                <div className="space-y-3">
                    {themeOptions.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setTheme(option.value)}
                            className={classnames(
                                "w-full flex items-center p-4 rounded-lg border-2 transition-all",
                                theme === option.value
                                    ? "border-primary-blue-default bg-primary-100 dark:bg-primary-blue-default/10"
                                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                            )}
                        >
                            <div className="flex items-center flex-1">
                                <div className={classnames(
                                    "mr-4 p-2 rounded-lg",
                                    theme === option.value
                                        ? "text-primary-blue-default"
                                        : "text-gray-600 dark:text-gray-400"
                                )}>
                                    {option.icon}
                                </div>
                                <div className="text-left">
                                    <div className={classnames(
                                        "font-semibold",
                                        theme === option.value
                                            ? "text-primary-blue-default"
                                            : "text-gray-900 dark:text-gray-100"
                                    )}>
                                        {option.label}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        {option.description}
                                    </div>
                                </div>
                            </div>

                            {/* Preview */}
                            <div className={classnames(
                                "ml-4 w-16 h-10 rounded border",
                                option.preview
                            )} />
                        </button>
                    ))}
                </div>

                {/* Current theme indicator */}
                <div className="mt-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        Current theme: <span className="font-semibold text-gray-900 dark:text-gray-100">{theme}</span>
                    </div>
                    {theme === 'system' && (
                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            System preference: {window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'}
                        </div>
                    )}
                </div>
            </div>
        </PopupLayout>
    )
}

export default ThemePreferencesPage
