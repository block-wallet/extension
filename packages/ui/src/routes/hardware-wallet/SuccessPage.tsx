import { useEffect, useState } from "react"

import Confetti from "react-dom-confetti"

import LogoHeader from "../../components/LogoHeader"
import PageLayout from "../../components/PageLayout"

import logo from "../../assets/images/logo.svg"
import { Devices } from "../../context/commTypes"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { capitalize } from "../../util/capitalize"

const HardwareWalletSuccessPage = () => {
    const history = useOnMountHistory()!

    const vendor = history.location.state.vendor as Devices
    const reconnect = (history.location.state.reconnect as boolean) ?? false

    const vendorName = capitalize(vendor.toString().toLowerCase())

    const [confettiActive, setConfettiActive] = useState(false)
    useEffect(() => {
        setConfettiActive(true)
    }, [])

    // Enhanced confetti config with dark theme awareness
    const config = {
        angle: 90,
        spread: 360,
        startVelocity: 40,
        elementCount: 70,
        dragFriction: 0.12,
        duration: 3000,
        stagger: 3,
        width: "10px",
        height: "10px",
        perspective: "500px",
        colors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"],
    }

    return (
        <>
            <div className="absolute w-full h-full flex flex-row items-center justify-center overflow-hidden z-10">
                <Confetti active={confettiActive} config={config} />
            </div>
            <PageLayout centered className="relative overflow-hidden bg-gray-50 dark:bg-gray-900 min-h-screen">
                <div className="flex flex-col items-center relative py-14 z-10">
                    <LogoHeader />
                    <div className="flex flex-col items-center my-12 space-y-8 max-w-2xl px-4">
                        {/* Success Icon */}
                        <div className="flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                            <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>

                        {/* Main Success Message */}
                        <h1 className="font-bold text-4xl md:text-5xl text-center text-gray-900 dark:text-gray-100 leading-tight">
                            🎉 {vendorName}{" "}
                            {!reconnect ? "Import Completed!" : "Reconnected!"}
                        </h1>

                        {/* Success Description */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                            <div className="text-center space-y-4">
                                {!reconnect ? (
                                    <div className="space-y-3">
                                        <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                            Your {vendorName} accounts were imported successfully! ✅
                                        </p>
                                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                            You can now access them in BlockWallet and start managing your digital assets securely.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                            Your {vendorName} device has been reconnected successfully! 🔗
                                        </p>
                                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                            You can continue with your current flow normally.
                                        </p>
                                    </div>
                                )}

                                {/* Next Steps */}
                                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2 flex items-center">
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Next Steps
                                    </h3>
                                    <p className="text-sm text-blue-800 dark:text-blue-300">
                                        Open BlockWallet via the extensions section of your browser to start using your {vendorName} accounts.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Additional Security Info */}
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800 max-w-md">
                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0">
                                    <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-green-900 dark:text-green-200">
                                        Secure Setup Complete
                                    </h4>
                                    <p className="text-sm text-green-800 dark:text-green-300 mt-1">
                                        Your private keys remain safely stored on your {vendorName} device.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Background Logo */}
                <div
                    className="absolute w-64 h-64 left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-5 dark:opacity-10"
                    style={{
                        background: `url(${logo})`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "center",
                        backgroundSize: "cover",
                    }}
                />
            </PageLayout>
        </>
    )
}

export default HardwareWalletSuccessPage
