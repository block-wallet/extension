import { FunctionComponent, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"

import PageLayout from "../../components/PageLayout"
import Divider from "../../components/Divider"
import Spinner from "../../components/spinner/Spinner"
import classnames from "classnames"
import { verifySeedPhrase } from "../../context/commActions"
import { findPositionOfSelectedWord, shuffleArray } from "../../util"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupFooter from "../../components/popup/PopupFooter"
import { useBlankState } from "../../context/background/backgroundHooks"
import { closeCurrentTab } from "../../util/window"
import IdleComponent from "../../components/IdleComponent"
import PopupLayout from "../../components/popup/PopupLayout"
import { CREATE_WALLET_STEP_LABELS } from "./PasswordSetupPage"

export interface SeedPhraseWord {
    word: string
    isSelected: boolean
}

const SeedWordsInput: FunctionComponent<{
    words: SeedPhraseWord[]
    value: SeedPhraseWord[]
    onChange: (words: SeedPhraseWord[]) => void
    compact?: boolean
    totalCount: number
}> = ({ words, value, onChange, compact = false, totalCount }) => {
    const [availableWords, setAvailableWords] = useState([...words])

    const handleWordClick = (
        seedWord: SeedPhraseWord,
        wordIndex: number,
        isInputClick: boolean
    ) => {
        let newValue = [...value]
        let updatedAvailableWords = [...availableWords]

        if (isInputClick) {
            newValue.splice(wordIndex, 1)
            const wordIndexInWords = findPositionOfSelectedWord(
                updatedAvailableWords,
                seedWord
            )
            updatedAvailableWords[wordIndexInWords].isSelected = false
        } else {
            if (seedWord.isSelected) {
                const wordIndexInInput = findPositionOfSelectedWord(
                    newValue,
                    seedWord
                )
                newValue.splice(
                    wordIndexInInput,
                    wordIndexInInput !== -1 ? 1 : 0
                )
            } else {
                newValue = [...value, { word: seedWord.word, isSelected: true }]
            }
            updatedAvailableWords[wordIndex].isSelected = !seedWord.isSelected
        }
        setAvailableWords(updatedAvailableWords)
        onChange(newValue)
    }

    return (
        <div className={compact ? "flex-1 flex flex-col space-y-3" : "space-y-4"}>
            <div className={compact ? "bg-white dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-lg p-3 min-h-[90px]" : "bg-white dark:bg-gray-800/50 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 min-h-[120px]"}>
                <h3 className={compact ? "text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2" : "text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3"}>
                    Selected Words ({value.length}/{totalCount})
                </h3>
                <div className={compact ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2" : "grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2"}>
                    {value.map((wordObj, index) => (
                        <button
                            type="button"
                            key={`${wordObj.word}_${index}`}
                            className={compact
                                ? "group relative bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-md py-1.5 px-2 text-xs font-medium shadow"
                                : "group relative bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg py-2 px-3 text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95"}
                            onClick={() => handleWordClick(wordObj, index, true)}
                        >
                            <span className={compact ? "mr-1 text-[10px] opacity-75" : "mr-1 text-xs opacity-75"}>#{index + 1}</span>
                            {wordObj.word}
                            {!compact && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    ×
                                </div>
                            )}
                        </button>
                    ))}
                </div>
                {value.length === 0 && (
                    <div className={compact ? "flex items-center justify-center h-12 text-gray-400 dark:text-gray-500" : "flex items-center justify-center h-16 text-gray-400 dark:text-gray-500"}>
                        <svg className={compact ? "w-5 h-5 mr-2" : "w-6 h-6 mr-2"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                        </svg>
                        <span className={compact ? "text-xs" : "text-sm"}>Click words below to add them</span>
                    </div>
                )}
            </div>

            <div>
                <h3 className={compact ? "text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2" : "text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3"}>
                    Available Words
                </h3>
                <div className={compact ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2" : "grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2"}>
                    {availableWords.map((wordObj, index) => (
                        <button
                            type="button"
                            key={`${wordObj.word}_${index}`}
                            className={classnames(
                                compact
                                    ? "rounded-md py-2 px-2 text-xs font-medium border"
                                    : "rounded-lg py-3 px-3 text-sm font-medium border-2 transition-all duration-200 transform hover:scale-105 active:scale-95",
                                wordObj.isSelected
                                    ? "border-transparent bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-50"
                                    : compact
                                        ? "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800/50 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                        : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800/50 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 shadow-sm hover:shadow-md"
                            )}
                            onClick={() => {
                                return handleWordClick(wordObj, index, false)
                            }}
                            disabled={wordObj.isSelected}
                        >
                            {wordObj.word}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

const SeedPhraseBlock = (props: any) => {
    const {
        isReminder,
        verificationError,
        seedWords,
        inputWords,
        onSeedWordsChange,
    } = props

    return (
        <div className={classnames(
            isReminder ? "flex-1 flex flex-col justify-between p-4 space-y-3" : "space-y-6 p-8"
        )}>
            {isReminder ? (
                <div className="text-center">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                        Select the words in the correct order to verify your phrase.
                    </p>
                </div>
            ) : (
                <div className="inline-flex items-start space-x-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg max-w-[520px]">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-blue-800 dark:text-blue-200 leading-tight">
                        Select the words below in the correct order to confirm your backup.
                    </p>
                </div>
            )}

            {verificationError && (
                <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-4">
                    <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                            <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-red-900 dark:text-red-100 mb-1">
                                Verification Failed
                            </h3>
                            <p className="text-xs text-red-800 dark:text-red-200">
                                {verificationError}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <SeedWordsInput
                words={seedWords}
                value={inputWords}
                onChange={(words) => onSeedWordsChange(words)}
                compact={isReminder}
                totalCount={seedWords.length}
            />
        </div>
    )
}

const BackupConfirmPage = () => {
    const { isUnlocked } = useBlankState()!
    useEffect(() => {
        if (!isUnlocked) {
            alert(
                "For security reasons the extension is now blocked. Login again in the extension to continue with the backup process."
            )
            closeCurrentTab()
        }
    }, [isUnlocked])
    const history: any = useOnMountHistory()
    const { seedPhrase, isReminder, password } = history.location.state
    const backLink = isReminder ? "/reminder" : "/setup/create/notice"
    const doneLink = isReminder ? "/reminder/backup/done" : "/setup/done"
    const [inputWords, setInputWords] = useState<SeedPhraseWord[]>([])
    const [isVerificationInProgress, setIsVerificationInProgress] =
        useState<boolean>(false)
    const [verificationError, setVerificationError] = useState<string>("")
    const seedWords = useMemo(() => {
        let wordsForSeedPhrase: SeedPhraseWord[] = []
        const words = seedPhrase.split(" ")
        shuffleArray(words)
        wordsForSeedPhrase = []
        words.forEach((word: string) => {
            wordsForSeedPhrase.push({
                word,
                isSelected: false,
            })
        })
        return wordsForSeedPhrase
    }, [seedPhrase])
    const totalWordsCount = useMemo(() => seedPhrase.split(" ").length, [seedPhrase])

    const isPhraseValid = () => {
        let inputPhrase: string[] = []
        inputWords.forEach((wordObj) => {
            inputPhrase.push(wordObj.word)
        }, "")
        return seedPhrase === inputPhrase.join(" ")
    }

    const confirmSeedPhrase = async () => {
        setIsVerificationInProgress(true)
        try {
            const isSeedPhraseVerified = await verifySeedPhrase(
                seedPhrase,
                password
            )
            if (isSeedPhraseVerified) {
                setVerificationError("")
                setIsVerificationInProgress(false)
                history.push({
                    pathname: doneLink,
                    state: { from: "wallet_creation" }
                })
            } else {
                setVerificationError("Verification failed")
            }
        } catch {
            setVerificationError("Error verificating the seed phrase")
        }
        setIsVerificationInProgress(false)
    }

    return (
        <IdleComponent>
            {isReminder ? (
                <PopupLayout
                    header={
                        <PopupHeader title="Confirm Seed Phrase" keepState />
                    }
                    footer={
                        <PopupFooter>
                            <ButtonWithLoading
                                label="Confirm"
                                isLoading={isVerificationInProgress}
                                onClick={confirmSeedPhrase}
                                disabled={!isPhraseValid()}
                            />
                        </PopupFooter>
                    }
                >
                    <div className="flex-1 flex flex-col">
                    <SeedPhraseBlock
                        isReminder={true}
                        verificationError={verificationError}
                        seedWords={seedWords}
                        inputWords={inputWords}
                        onSeedWordsChange={(words: any) => setInputWords(words)}
                    />
                    </div>
                </PopupLayout>
            ) : (
                    <PageLayout
                        screen
                        className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900/30 h-screen flex items-center justify-center"
                        withSteps={!isReminder}
                        currentStep={3}
                        totalSteps={4}
                        stepLabels={CREATE_WALLET_STEP_LABELS}
                    >
                        <div className="relative z-10 w-full max-w-6xl mx-auto px-6 py-3 h-full flex flex-col justify-center">
                        <div className="text-center mb-3">
                            <h1 className="text-lg font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 dark:from-gray-100 dark:via-blue-100 dark:to-indigo-100 bg-clip-text text-transparent mb-1">
                                Confirm Secret Phrase
                            </h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                                Verify your seed phrase by selecting words in the correct order
                            </p>
                        </div>

                        <Divider />

                            <div className="mt-2">
                                <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg dark:shadow-xl overflow-hidden">
                                <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-indigo-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-indigo-900/20 p-2.5 border-b border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-center space-x-3">
                                        <div className="w-7 h-7 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center shadow">
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <h2 className="text-xs font-bold text-gray-900 dark:text-gray-100">Verify Your Backup</h2>
                                    </div>
                                </div>

                                <div className="p-3">
                                    <SeedPhraseBlock
                                        isReminder={isReminder}
                                        verificationError={verificationError}
                                        seedWords={seedWords}
                                        inputWords={inputWords}
                                        onSeedWordsChange={(words: any) => setInputWords(words)}
                                    />
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-800/50 p-3 border-t border-gray-200 dark:border-gray-700">
                                    <div className="flex flex-row justify-between space-x-4">
                                        <Link
                                            to={{
                                                pathname: backLink,
                                                state: { seedPhrase, password },
                                            }}
                                            className="flex items-center px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm max-w-[170px]"
                                            draggable={false}
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                            Back
                                        </Link>

                                        <button
                                            type="button"
                                            className={classnames(
                                                "flex items-center justify-center px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg max-w-[170px] min-w-[130px]",
                                                (!isPhraseValid() || isVerificationInProgress) &&
                                                "opacity-50 pointer-events-none transform-none"
                                            )}
                                            onClick={confirmSeedPhrase}
                                            disabled={!isPhraseValid() || isVerificationInProgress}
                                        >
                                            {!isVerificationInProgress ? (
                                                <>
                                                    <span>Confirm</span>
                                                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </>
                                            ) : (
                                                <>
                                                    <Spinner />
                                                    <span className="ml-2">Verifying...</span>
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {!isPhraseValid() && inputWords.length > 0 && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
                                            Please select all {totalWordsCount} words in the correct order
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
            )}
        </IdleComponent>
    )
}

export default BackupConfirmPage
