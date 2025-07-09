import { Link } from "react-router-dom"

import { Classes, classnames } from "../styles/classes"
import PageLayout from "../components/PageLayout"
import logo from "../assets/images/logo.svg"

const IntroductionPage = () => (
    <PageLayout header className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900/30">
        <div className="flex flex-col items-center relative my-8 mx-6 z-10 max-w-md">
            {/* Hero Section */}
            <div className="flex flex-col items-center mb-12 space-y-8 text-center">
                {/* Logo with glow effect */}
                <div className="relative">
                    <div className="absolute -inset-4 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-20 dark:opacity-30 blur-lg animate-pulse"></div>
                    <div
                        className="relative w-20 h-20 bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-2xl flex items-center justify-center border border-gray-200 dark:border-gray-700"
                        style={{
                            background: `url(${logo}) center/60% no-repeat, linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)`,
                        }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 dark:from-blue-400/10 dark:to-purple-400/10 rounded-2xl"></div>
                    </div>
                </div>

                {/* Main heading with gradient text */}
                <div className="space-y-4">
                    <h1 className="font-black text-4xl md:text-5xl bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 dark:from-gray-100 dark:via-blue-100 dark:to-indigo-100 bg-clip-text text-transparent leading-tight">
                        Welcome to<br />
                        <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 dark:from-blue-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
                            BlockWallet
                        </span>
                    </h1>

                    <p className="text-lg text-gray-600 dark:text-gray-300 max-w-sm mx-auto leading-relaxed font-medium">
                        Your gateway to Web3 with uncompromising privacy and security
                    </p>
                </div>

                {/* Feature highlights */}
                <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
                    <div className="flex flex-col items-center space-y-2 p-3 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                        <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Secure</span>
                    </div>

                    <div className="flex flex-col items-center space-y-2 p-3 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Fast</span>
                    </div>

                    <div className="flex flex-col items-center space-y-2 p-3 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                        <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </div>
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Private</span>
                    </div>
                </div>
            </div>

            {/* CTA Button */}
            <div className="w-full max-w-xs">
                <Link
                    to="/setup"
                    className="group relative w-full flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl dark:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95"
                >
                    <span className="relative z-10">Get Started</span>
                    <svg className="w-6 h-6 ml-2 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>

                    {/* Gradient overlay for hover effect */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Link>

                {/* Subtle subtitle */}
                <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4 font-medium">
                    Create a new wallet or import an existing one
                </p>
            </div>
        </div>

        {/* Decorative background elements */}
        <div className="absolute top-1/4 -left-8 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 dark:from-blue-400/5 dark:to-purple-400/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-8 w-40 h-40 bg-gradient-to-tl from-indigo-400/10 to-purple-400/10 dark:from-indigo-400/5 dark:to-purple-400/5 rounded-full blur-3xl"></div>

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(100,100,100,0.3) 1px, transparent 0)`,
            backgroundSize: '24px 24px'
        }}></div>
    </PageLayout>
)

export default IntroductionPage
