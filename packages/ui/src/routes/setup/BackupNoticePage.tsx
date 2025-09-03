import { useEffect, useState } from "react"

import classnames from "classnames"

import { Link } from "react-router-dom"

import PageLayout from "../../components/PageLayout"
import Divider from "../../components/Divider"

import LinkButton from "../../components/button/LinkButton"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import ClickToReveal from "../../components/label/ClickToReveal"
import { useBlankState } from "../../context/background/backgroundHooks"
import { closeCurrentTab } from "../../util/window"
import IdleComponent from "../../components/IdleComponent"
import { CREATE_WALLET_STEP_LABELS } from "./PasswordSetupPage"


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
                className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900/30 h-screen flex items-center justify-center"
                withSteps={true}
                currentStep={2}
                totalSteps={4}
                stepLabels={CREATE_WALLET_STEP_LABELS}
            >
                <div className="relative z-10 w-full max-w-6xl mx-auto px-6 py-3 h-full flex flex-col justify-center">
                    <div className="text-center mb-3">
                        <h1 className="text-lg font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 dark:from-gray-100 dark:via-blue-100 dark:to-indigo-100 bg-clip-text text-transparent mb-1">
                            Secret Phrase
                        </h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                            Save your seed phrase in a secure location
                        </p>
                    </div>

                    <Divider />

                    <div className="mt-3">
                        <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg dark:shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-3 gap-0">
                            <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-4 border-b lg:border-b-0 lg:border-r border-orange-200 dark:border-orange-800/50">
                                <div className="text-center space-y-2">
                                    <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg mx-auto flex items-center justify-center shadow-lg">
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-bold text-orange-900 dark:text-orange-100">
                                            Backup Wallet
                                        </h2>
                                        <p className="text-xs text-orange-800 dark:text-orange-200">
                                            Recovery access
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-b lg:border-b-0 lg:border-r border-red-200 dark:border-red-800/50 p-4">
                                <div className="space-y-3">
                                    <div className="flex items-start space-x-2">
                                        <svg className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                        <div>
                                            <h3 className="text-xs font-bold text-red-900 dark:text-red-100 mb-1">
                                                Security Notice
                                            </h3>
                                            <p className="text-xs text-red-800 dark:text-red-200 leading-tight">
                                                Seed phrase is your only recovery method. Store safely, never share.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2 mt-3">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-4 h-4 bg-green-100 dark:bg-green-900/30 rounded flex items-center justify-center">
                                                <svg className="w-2 h-2 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 8 8">
                                                    <circle cx="4" cy="4" r="3"/>
                                                </svg>
                                            </div>
                                            <span className="text-xs text-gray-700 dark:text-gray-300">Your keys, your crypto</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-4 h-4 bg-blue-100 dark:bg-blue-900/30 rounded flex items-center justify-center">
                                                <svg className="w-2 h-2 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 8 8">
                                                    <circle cx="4" cy="4" r="3"/>
                                                </svg>
                                            </div>
                                            <span className="text-xs text-gray-700 dark:text-gray-300">Keep keys safe offline</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-4 h-4 bg-purple-100 dark:bg-purple-900/30 rounded flex items-center justify-center">
                                                <svg className="w-2 h-2 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 8 8">
                                                    <circle cx="4" cy="4" r="3"/>
                                                </svg>
                                            </div>
                                            <span className="text-xs text-gray-700 dark:text-gray-300">Keys are your backup</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4">
                                <ClickToReveal
                                    hiddenText={seedPhrase}
                                    revealMessage={"Click here to reveal secret words"}
                                    revealed={revealed}
                                    onClick={() => setRevealed(true)}
                                    allowDownload={true}
                                />
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 border-t border-gray-200 dark:border-gray-700 col-span-1 lg:col-span-3">
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

                <div className="absolute top-1/4 -left-8 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 dark:from-blue-400/5 dark:to-purple-400/5 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-1/4 -right-8 w-40 h-40 bg-gradient-to-tl from-indigo-400/10 to-purple-400/10 dark:from-indigo-400/5 dark:to-purple-400/5 rounded-full blur-3xl pointer-events-none"></div>

                <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none" style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, rgba(100,100,100,0.3) 1px, transparent 0)`,
                    backgroundSize: '24px 24px'
                }}></div>
            </PageLayout>
        </IdleComponent>
    )
}

export default BackupNoticePage
