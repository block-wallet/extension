import { useEffect, useState } from "react"

import classnames from "classnames"

import { Link } from "react-router-dom"

import PageLayout from "../../components/PageLayout"
import Divider from "../../components/Divider"
import { Classes } from "../../styles/classes"

import keyIcon from "../../assets/images/icons/key.svg"
import safeIcon from "../../assets/images/icons/safe.svg"
import yourBackupIcon from "../../assets/images/icons/your_backup.svg"

import LinkButton from "../../components/button/LinkButton"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import ClickToReveal from "../../components/label/ClickToReveal"
import { useBlankState } from "../../context/background/backgroundHooks"
import { closeCurrentTab } from "../../util/window"
import IdleComponent from "../../components/IdleComponent"
import { CREATE_WALLET_STEP_LABELS } from "./PasswordSetupPage"

const SideTips = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        <div className="group">
            <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-lg dark:shadow-xl hover:shadow-xl dark:hover:shadow-2xl transition-all duration-300 transform hover:scale-105 h-full">
                <div className="flex flex-col space-y-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl flex items-center justify-center shadow-sm">
                        <img src={keyIcon} className="w-5 h-5 filter brightness-75 dark:brightness-125" alt="" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                            Your keys, your crypto
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            Only you have access to your wallet and the funds in it.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <div className="group">
            <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-lg dark:shadow-xl hover:shadow-xl dark:hover:shadow-2xl transition-all duration-300 transform hover:scale-105 h-full">
                <div className="flex flex-col space-y-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-xl flex items-center justify-center shadow-sm">
                        <img src={safeIcon} className="w-5 h-5 filter brightness-75 dark:brightness-125" alt="" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                            Keep your keys safe
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            Never disclose your keys to anyone and store them offline.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <div className="group">
            <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-lg dark:shadow-xl hover:shadow-xl dark:hover:shadow-2xl transition-all duration-300 transform hover:scale-105 h-full">
                <div className="flex flex-col space-y-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl flex items-center justify-center shadow-sm">
                        <img src={yourBackupIcon} className="w-5 h-5 filter brightness-75 dark:brightness-125" alt="" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                            Your keys are your backup
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            Use keys if you forget your password or lose your device.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
)

const BackupNoticePage = () => {
    const { isUnlocked } = useBlankState()!
    useEffect(() => {
        if (!isUnlocked) {
            alert(
                "For security reasons the extension is now blocked. Login again in the extension to continue with the backup process."
            )
            closeCurrentTab()
        }
    }, [isUnlocked])

    const [revealed, setRevealed] = useState(false)
    const history: any = useOnMountHistory()
    const { seedPhrase, password } = history.location.state

    return (
        <IdleComponent>
            <PageLayout
                header
                className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900/30 min-h-screen"
                withSteps={true}
                currentStep={2}
                totalSteps={4}
                stepLabels={CREATE_WALLET_STEP_LABELS}
            >
                <div className="relative z-10 w-full max-w-4xl mx-auto px-4 py-8">
                    {/* Page header */}
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 dark:from-gray-100 dark:via-blue-100 dark:to-indigo-100 bg-clip-text text-transparent mb-2">
                            Secret Phrase
                        </h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                            Save your seed phrase in a secure location
                        </p>
                    </div>

                    <Divider />

                    {/* Main content card */}
                    <div className="mt-8">
                        <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl dark:shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-indigo-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-indigo-900/20 p-6 border-b border-gray-200 dark:border-gray-700">
                                <div className="text-center space-y-3">
                                    <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl mx-auto flex items-center justify-center shadow-lg">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                            Backup Your Wallet
                                        </h2>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                            This is the only way to recover your wallet
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-8 space-y-8">
                                {/* Warning message */}
                                <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-4">
                                    <div className="flex items-start space-x-3">
                                        <div className="flex-shrink-0">
                                            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-red-900 dark:text-red-100 mb-1">
                                                Important Security Notice
                                            </h3>
                                            <p className="text-xs text-red-800 dark:text-red-200 leading-relaxed">
                                                Your seed phrase is the key to your wallet. Use it to recover your funds or access your wallet on other devices.
                                                Back up your seed phrase and store it in a safe place. Never share it with anyone.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Security tips */}
                                <SideTips />

                                {/* Seed phrase reveal */}
                                <div className="bg-gray-50 dark:bg-gray-800/30 rounded-xl p-6">
                                    <ClickToReveal
                                        hiddenText={seedPhrase}
                                        revealMessage={"Click here to reveal secret words"}
                                        revealed={revealed}
                                        onClick={() => setRevealed(true)}
                                        allowDownload={true}
                                    />
                                </div>
                            </div>

                            {/* Footer with actions */}
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-6 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex flex-row justify-between space-x-4">
                                    <LinkButton
                                        location="/setup/done"
                                        text="Remind me later"
                                        lite
                                        classes="flex items-center px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm max-w-[200px]"
                                    />

                                    <Link
                                        to={{
                                            pathname: "/setup/create/verify",
                                            state: { seedPhrase, isReminder: false, password },
                                        }}
                                        className={classnames(
                                            "flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg max-w-[200px]",
                                            !revealed && "opacity-50 pointer-events-none"
                                        )}
                                        draggable={false}
                                    >
                                        <span>Verify Phrase</span>
                                        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </Link>
                                </div>

                                {!revealed && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
                                        You must reveal your seed phrase before continuing
                                    </p>
                                )}
                            </div>
                        </div>
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
        </IdleComponent>
    )
}

export default BackupNoticePage
