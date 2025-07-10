import { FC } from "react"
import { LINKS } from "../../util/constants"
import { ButtonWithLoading } from "../button/ButtonWithLoading"
import PopupFooter from "../popup/PopupFooter"
import PopupLayout from "../popup/PopupLayout"
import Info from "./Info"
import { useBlankState } from "../../context/background/backgroundHooks"

interface WelcomeInfoProps {
    onDismiss: () => Promise<boolean>
}

const WelcomeInfo: FC<WelcomeInfoProps> = ({ onDismiss }) => {
    const { settings } = useBlankState()!

    return (
        <PopupLayout
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        onClick={onDismiss}
                        label="Start Using BlockWallet"
                    />
                </PopupFooter>
            }
            submitOnEnter={{ onSubmit: onDismiss }}
        >
            <div className="w-full bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900/30 min-h-full">
                {/* Header Section */}
                <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-indigo-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-indigo-900/20 p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="text-center space-y-4">
                        {/* Welcome Icon */}
                        <div className="relative mx-auto w-16 h-16 mb-4">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
                            <div className="relative w-full h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-xl">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 dark:from-gray-100 dark:via-blue-100 dark:to-indigo-100 bg-clip-text text-transparent mb-2">
                                Welcome to BlockWallet! 🎉
                            </h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Your wallet is ready! Here's what you need to know to get started.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-6 space-y-6">
                    {/* Browser Wallet Status */}
                    <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
                        <div className="p-4">
                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 mt-1">
                                    {settings.defaultBrowserWallet ? (
                                        <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                                            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                                            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                        {settings.defaultBrowserWallet ? "Default Wallet Status" : "Browser Wallet Setup"}
                                    </h3>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                        {settings.defaultBrowserWallet
                                            ? "BlockWallet is your default browser wallet to interact with DApps."
                                            : "Set BlockWallet as your default browser wallet to interact with DApps."
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* DApp Connection Guide */}
                    <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                </div>
                                <h3 className="text-sm font-bold text-blue-900 dark:text-blue-100">
                                    Connecting to DApps
                                </h3>
                            </div>
                        </div>

                        <div className="p-4 space-y-4">
                            <div className="space-y-3">
                                <div className="flex items-start space-x-3">
                                    <div className="flex-shrink-0 w-6 h-6 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mt-0.5">
                                        <span className="text-yellow-700 dark:text-yellow-400 text-xs font-bold">1</span>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                                            Select <span className="font-semibold">BlockWallet</span> or the <span className="font-semibold">injected option</span> when connecting to DApps.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-3">
                                    <div className="flex-shrink-0 w-6 h-6 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mt-0.5">
                                        <span className="text-yellow-700 dark:text-yellow-400 text-xs font-bold">2</span>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                                            If you don't see BlockWallet's logo when connecting, try selecting another browser wallet's logo.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Community Support */}
                    <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-sm font-bold text-green-900 dark:text-green-100">
                                    Need Help?
                                </h3>
                            </div>
                        </div>

                        <div className="p-4">
                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0">
                                    <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12,2C13.65,2 15,3.35 15,5C15,6.65 13.65,8 12,8C10.35,8 9,6.65 9,5C9,3.35 10.35,2 12,2M21,9V7L15,13.5C14.76,13.77 14.4,13.91 14.04,13.91C13.6,13.91 13.18,13.74 12.87,13.44L10.25,10.81L4,17.05V19H20V9H21Z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                                        Join our{" "}
                                        <a
                                            target="_blank"
                                            rel="noreferrer"
                                            href={LINKS.TELEGRAM}
                                            className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline transition-colors duration-200"
                                        >
                                            Telegram group
                                        </a>{" "}
                                        if you have any questions or feedback. Our community is here to help!
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Final Welcome Message */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800/50 rounded-xl p-4">
                        <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-green-900 dark:text-green-100 mb-1">
                                    Welcome to Web3! 🚀
                                </h3>
                                <p className="text-xs text-green-800 dark:text-green-200 leading-relaxed">
                                    We hope you enjoy using BlockWallet! Your privacy and security are our top priorities.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Decorative background elements */}
                <div className="absolute top-1/4 -left-8 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 dark:from-blue-400/5 dark:to-purple-400/5 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-1/4 -right-8 w-40 h-40 bg-gradient-to-tl from-indigo-400/10 to-purple-400/10 dark:from-indigo-400/5 dark:to-purple-400/5 rounded-full blur-3xl pointer-events-none"></div>
            </div>
        </PopupLayout>
    )
}

export default WelcomeInfo
