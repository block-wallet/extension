import { useEffect, useState } from "react"

import Confetti from "react-dom-confetti"
import { FaGithub, FaTelegramPlane } from "react-icons/fa"
import { IoLogoTwitter } from "react-icons/io"

import PageLayout from "../../components/PageLayout"
import Divider from "../../components/Divider"

import { completeSetup } from "../../context/commActions"
import { useOnMountHistory } from "../../context/hooks/useOnMount"

import logo from "../../assets/images/logo.svg"
import { LINKS } from "../../util/constants"
import { CREATE_WALLET_STEP_LABELS } from "./PasswordSetupPage"

const links = [
    {
        icon: <FaGithub className="w-5 h-5" />,
        link: LINKS.GITHUB,
        label: "GitHub",
        color: "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
    },
    {
        icon: <IoLogoTwitter className="w-5 h-5" />,
        link: LINKS.TWITTER,
        label: "Twitter",
        color: "hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400"
    },
    {
        icon: <FaTelegramPlane className="w-5 h-5" />,
        link: LINKS.TELEGRAM,
        label: "Telegram",
        color: "hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-500 dark:text-blue-400"
    },
]

const SetupDonePage = () => {
    const history: any = useOnMountHistory()
    const [confettiActive, setConfettiActive] = useState(false)

    useEffect(() => {
        // Trigger confetti after a short delay for better effect
        const confettiTimer = setTimeout(() => {
            setConfettiActive(true)
        }, 500)

        let sendNotification = true
        if (history.location && history.location.state) {
            sendNotification = history.location.state.sendNotification
        }
        completeSetup(sendNotification)

        return () => clearTimeout(confettiTimer)
    }, [history])

    // Determine if we are coming from the wallet creation flow
    const isFromWalletCreation = history.location?.state?.from === "wallet_creation" ||
        history.location?.pathname?.includes("/setup/create");

    const config = {
        angle: 90,
        spread: 360,
        startVelocity: 45,
        elementCount: 100,
        dragFriction: 0.1,
        duration: 4000,
        stagger: 2,
        width: "12px",
        height: "12px",
        perspective: "500px",
        colors: ["#3B82F6", "#8B5CF6", "#06B6D4", "#10B981", "#F59E0B", "#EF4444"],
    }

    return (
        <>
            {/* Enhanced Confetti */}
            <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
                <Confetti active={confettiActive} config={config} />
            </div>

            <PageLayout
                header
                centered
                className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900/30 min-h-screen"
                withSteps={isFromWalletCreation}
                currentStep={4}
                totalSteps={4}
                stepLabels={CREATE_WALLET_STEP_LABELS}
            >
                <div className="relative z-10 w-full max-w-3xl mx-auto px-4 py-8">
                    {/* Success Animation & Content */}
                    <div className="text-center space-y-8 mb-12">
                        {/* Success Icon with Animation */}
                        <div className="relative mx-auto w-20 h-20 mb-8">
                            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse"></div>
                            <div className="relative w-full h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-xl">
                                <svg className="w-10 h-10 text-white animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        </div>

                        {/* Main Success Message */}
                        <div className="space-y-4">
                            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 dark:from-gray-100 dark:via-blue-100 dark:to-indigo-100 bg-clip-text text-transparent leading-tight">
                                🎉 Ready to Go!
                            </h1>
                            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
                                Your BlockWallet is now set up and ready to use. Welcome to the future of decentralized finance!
                            </p>
                        </div>
                    </div>

                    {/* Main Content Cards */}
                    <div className="grid gap-6 md:gap-8 max-w-4xl mx-auto">
                        {/* Getting Started Card */}
                        <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl dark:shadow-2xl overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-indigo-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-indigo-900/20 p-6 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                            Quick Start Guide
                                        </h2>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Everything you need to know to get started
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="flex items-start space-x-3 p-4 bg-gray-50 dark:bg-gray-800/30 rounded-xl">
                                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                            <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">1</span>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                                Access Your Wallet
                                            </h3>
                                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                                Click the BlockWallet extension icon in your browser's toolbar
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start space-x-3 p-4 bg-gray-50 dark:bg-gray-800/30 rounded-xl">
                                        <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                                            <span className="text-purple-600 dark:text-purple-400 font-bold text-sm">2</span>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                                Start Exploring
                                            </h3>
                                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                                Send, receive, and manage your crypto assets securely
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="flex-shrink-0">
                                            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-1">
                                                Security Reminder
                                            </h3>
                                            <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                                                Keep your seed phrase safe and never share it with anyone. It's your only way to recover your wallet.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Community Card */}
                        <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl dark:shadow-2xl overflow-hidden">
                            <div className="bg-gradient-to-r from-green-50 via-blue-50 to-purple-50 dark:from-green-900/20 dark:via-blue-900/20 dark:to-purple-900/20 p-6 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                            Join Our Community
                                        </h2>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Stay updated and get support from our community
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
                                    Keep track of updates, ask questions, and connect with other BlockWallet users.
                                </p>

                                <div className="grid gap-3 md:grid-cols-3">
                                    {links.map(({ link, icon, label, color }, index) => (
                                        <a
                                            key={index}
                                            href={link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`group flex items-center justify-center space-x-3 p-4 border border-gray-200 dark:border-gray-700 rounded-xl transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95 ${color}`}
                                        >
                                            <div className="transition-transform duration-200 group-hover:scale-110">
                                                {icon}
                                            </div>
                                            <span className="text-sm font-semibold">
                                                {label}
                                            </span>
                                            <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-0 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Message */}
                    <div className="text-center mt-12 space-y-4">
                        <div className="inline-flex items-center space-x-2 bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-full px-6 py-3 shadow-lg">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Wallet successfully configured
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                            Thank you for choosing BlockWallet. Your privacy and security are our top priorities.
                        </p>
                    </div>
                </div>

                {/* Enhanced Background Logo */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div
                        className="w-96 h-96 opacity-[0.02] dark:opacity-[0.05] transform rotate-12"
                        style={{
                            background: `url(${logo})`,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "center",
                            backgroundSize: "contain",
                        }}
                    />
                </div>

                {/* Decorative background elements */}
                <div className="absolute top-1/4 -left-8 w-32 h-32 bg-gradient-to-br from-green-400/10 to-blue-400/10 dark:from-green-400/5 dark:to-blue-400/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 -right-8 w-40 h-40 bg-gradient-to-tl from-purple-400/10 to-pink-400/10 dark:from-purple-400/5 dark:to-pink-400/5 rounded-full blur-3xl"></div>

                {/* Subtle grid pattern */}
                <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]" style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, rgba(100,100,100,0.3) 1px, transparent 0)`,
                    backgroundSize: '24px 24px'
                }}></div>
            </PageLayout>
        </>
    )
}

export default SetupDonePage
