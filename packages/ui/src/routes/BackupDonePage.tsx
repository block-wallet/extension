import PopupLayout from "../components/popup/PopupLayout"
import PopupHeader from "../components/popup/PopupHeader"
import LinkButton from "../components/button/LinkButton"
import logo from "../assets/images/logo.svg"
import PopupFooter from "../components/popup/PopupFooter"
import Confetti from "react-dom-confetti"
import { useState, useEffect } from "react"

const BackupDonePage = () => {
    const [confettiActive, setConfettiActive] = useState(false)

    useEffect(() => {
        const timer = setTimeout(() => {
            setConfettiActive(true)
        }, 500)
        return () => clearTimeout(timer)
    }, [])

    const confettiConfig = {
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
        <PopupLayout
            header={
                <PopupHeader title="You're Now Safe!" backButton={false} />
            }
            footer={
                <PopupFooter>
                    <LinkButton
                        location="/"
                        text="Done"
                        lite
                        classes="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg"
                    />
                </PopupFooter>
            }
        >
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900/30 min-h-full">
                {/* Confetti */}
                <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
                    <Confetti active={confettiActive} config={confettiConfig} />
                </div>

                {/* Main content */}
                <div className="relative z-10 flex flex-col items-center justify-center w-full h-full space-y-8 p-6">
                    {/* Success Icon */}
                    <div className="relative w-20 h-20">
                        <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse"></div>
                        <div className="relative w-full h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-xl">
                            <svg className="w-10 h-10 text-white animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="text-center space-y-6">
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 dark:from-gray-100 dark:via-blue-100 dark:to-indigo-100 bg-clip-text text-transparent">
                            🎉 Backup Complete!
                        </h1>
                        <div className="space-y-4">
                            <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                You've successfully backed up your seed phrase.
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                You can now continue using BlockWallet with peace of mind.
                            </p>
                        </div>
                    </div>

                    {/* Logo */}
                    <div className="relative w-16 h-16">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-30 blur-lg"></div>
                        <img
                            src={logo}
                            alt="BlockWallet"
                            className="relative w-full h-full rounded-full shadow-lg"
                        />
                    </div>

                    {/* Status */}
                    <div className="inline-flex items-center space-x-2 bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-full px-6 py-3 shadow-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Backup successfully created
                        </span>
                    </div>
                </div>

                {/* Decorative background elements */}
                <div className="absolute top-1/4 -left-8 w-32 h-32 bg-gradient-to-br from-green-400/10 to-blue-400/10 dark:from-green-400/5 dark:to-blue-400/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 -right-8 w-40 h-40 bg-gradient-to-tl from-purple-400/10 to-pink-400/10 dark:from-purple-400/5 dark:to-pink-400/5 rounded-full blur-3xl"></div>

                {/* Subtle grid pattern */}
                <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]" style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, rgba(100,100,100,0.3) 1px, transparent 0)`,
                    backgroundSize: '24px 24px'
                }}></div>
            </div>
        </PopupLayout>
    )
}

export default BackupDonePage
