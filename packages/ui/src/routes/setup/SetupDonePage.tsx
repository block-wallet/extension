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
        const confettiTimer = setTimeout(() => {
            setConfettiActive(true)
        }, 500)

        let sendNotification = true
        if (history.location && history.location.state) {
            sendNotification = history.location.state.sendNotification
        }
        const completeTimer = setTimeout(() => {
            completeSetup(sendNotification)
        }, 2500)

        return () => {
            clearTimeout(confettiTimer)
            clearTimeout(completeTimer)
        }
    }, [history])

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
            <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
                <Confetti active={confettiActive} config={config} />
            </div>

            <PageLayout
                screen
                className="w-full h-screen max-w-none shadow-none rounded-none relative bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900/20 flex flex-col"
                withSteps={isFromWalletCreation}
                currentStep={4}
                totalSteps={4}
                stepLabels={CREATE_WALLET_STEP_LABELS}
            >
                <div className="flex-1 flex flex-col py-3 min-h-0">
                    <div className="text-center mb-2 px-6">
                        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
                            Setup Complete
                        </h1>
                        <p className="text-xs text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
                            Your BlockWallet is now ready to use.
                        </p>
                    </div>

                    <Divider className="my-2" />

                    <div className="flex-1 flex flex-col justify-center w-full px-6 py-3 min-h-0 overflow-hidden">
                        <div className="relative z-10 w-full max-w-4xl mx-auto">
                            <div className="text-center mb-3">
                                <div className="relative mx-auto w-12 h-12 mb-3">
                                    <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse"></div>
                                    <div className="relative w-full h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-xl">
                                        <svg className="w-6 h-6 text-white animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                </div>

                                <h2 className="text-xl md:text-2xl font-black bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 dark:from-gray-100 dark:via-blue-100 dark:to-indigo-100 bg-clip-text text-transparent leading-tight">
                                    🎉 Ready to Go!
                                </h2>
                                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed mt-1">
                                    Welcome to the future of decentralized finance.
                                </p>
                            </div>

                            <div className="grid gap-2 md:gap-3 max-w-3xl mx-auto">
                                <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl dark:shadow-2xl overflow-hidden">
                                    <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-indigo-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-indigo-900/20 p-3 border-b border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                    Quick Start Guide
                                                </h2>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-3 space-y-2">
                                        <div className="grid gap-2 md:grid-cols-2">
                                            <div className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800/30 rounded-xl">
                                                <div className="flex-shrink-0 w-7 h-7 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
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

                                            <div className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800/30 rounded-xl">
                                                <div className="flex-shrink-0 w-7 h-7 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
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

                                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-2.5">
                                            <div className="flex items-center space-x-3">
                                                <div className="flex-shrink-0">
                                                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h3 className="text-xs font-bold text-blue-900 dark:text-blue-100 mb-0.5">
                                                        Security Reminder
                                                    </h3>
                                                    <p className="text-[11px] text-blue-800 dark:text-blue-200 leading-snug">
                                                        Keep your seed phrase safe and never share it with anyone. It's your only way to recover your wallet.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl dark:shadow-2xl overflow-hidden">
                                    <div className="bg-gradient-to-r from-green-50 via-blue-50 to-purple-50 dark:from-green-900/20 dark:via-blue-900/20 dark:to-purple-900/20 p-3 border-b border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                    Join Our Community
                                                </h2>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-3">
                                        <div className="grid gap-3 md:grid-cols-3">
                                            {links.map(({ link, icon, label, color }, index) => (
                                                <a
                                                    key={index}
                                                    href={link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`group flex items-center justify-center space-x-3 p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95 ${color}`}
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

                            <div className="text-center mt-2.5 space-y-2">
                                <div className="inline-flex items-center space-x-2 bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-full px-3 py-1.5 shadow-lg">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                        Wallet successfully configured
                                    </span>
                                </div>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                                    Thank you for choosing BlockWallet. Your privacy and security are our top priorities.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

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

                <div className="absolute top-1/4 -left-12 w-24 h-24 bg-gradient-to-br from-blue-400/10 to-purple-400/10 dark:from-blue-400/5 dark:to-purple-400/5 rounded-full blur-2xl"></div>
                <div className="absolute bottom-1/3 -right-12 w-32 h-32 bg-gradient-to-tl from-indigo-400/10 to-blue-400/10 dark:from-indigo-400/5 dark:to-blue-400/5 rounded-full blur-2xl"></div>

                <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]" style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, rgba(100,100,100,0.3) 1px, transparent 0)`,
                    backgroundSize: '24px 24px'
                }}></div>
            </PageLayout>
        </>
    )
}

export default SetupDonePage
