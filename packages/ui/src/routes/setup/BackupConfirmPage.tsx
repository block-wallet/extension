import { FunctionComponent, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"

import PageLayout from "../../components/PageLayout"
import Divider from "../../components/Divider"
import Spinner from "../../components/spinner/Spinner"
import classnames from "classnames"
import { Classes } from "../../styles/classes"
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

export interface SeedPhraseWord {
    word: string
    isSelected: boolean
}

const SeedWordsInput: FunctionComponent<{
    words: SeedPhraseWord[]
    value: SeedPhraseWord[]
    onChange: (words: SeedPhraseWord[]) => void
}> = ({ words, value, onChange }) => {
    const [availableWords, setAvailableWords] = useState([...words])

    const handleWordClick = (
        seedWord: SeedPhraseWord,
        wordIndex: number,
        isInputClick: boolean
    ) => {
        let newValue = [...value]
        let updatedAvailableWords = [...availableWords]

        if (isInputClick) {
            // remove the word from the input
            newValue.splice(wordIndex, 1)
            const wordIndexInWords = findPositionOfSelectedWord(
                updatedAvailableWords,
                seedWord
            )
            updatedAvailableWords[wordIndexInWords].isSelected = false
        } else {
            if (seedWord.isSelected) {
                // find the word in the input and remove it
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
        <div className="flex flex-col space-y-4">
            <div className="p-2 border border-primary-grey-default rounded-md grid grid-cols-4 grid-rows-3 gap-2 h-36">
                {value.map((wordObj, index) => (
                    <button
                        type="button"
                        key={`${wordObj.word}_${index}`}
                        className="bg-primary-black-default text-white rounded-md py-2"
                        style={{ height: "fit-content" }}
                        onClick={() => handleWordClick(wordObj, index, true)}
                    >
                        {wordObj.word}
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-4 gap-2">
                {availableWords.map((wordObj, index) => (
                    <button
                        type="button"
                        key={`${wordObj.word}_${index}`}
                        className={classnames(
                            "rounded-md py-3 border",
                            wordObj.isSelected
                                ? "border-transparent bg-primary-black-default text-white"
                                : "border-primary-grey-default text-primary-black-default"
                        )}
                        onClick={() => {
                            return handleWordClick(wordObj, index, false)
                        }}
                    >
                        {wordObj.word}
                    </button>
                ))}
            </div>
        </div>
    )
}

// subcomponent
const SeedPhraseBlock = (props: any) => {
    const {
        isReminder,
        verificationError,
        seedWords,
        inputWords,
        onSeedWordsChange,
    } = props

    return (
        <div
            className={classnames(
                "flex flex-col text-primary-grey-dark text-sm",
                isReminder ? "space-y-6 p-4" : "space-y-8 p-8"
            )}
        >
            <span>
                Make sure that you've got it right - type out your phrase by
                selecting the words below in the correct order.
            </span>

            <span
                className={classnames(
                    "text-red-500 text-xs",
                    verificationError ? "" : "hidden"
                )}
            >
                verificationError || <>&nbsp;</>
            </span>
            <SeedWordsInput
                words={seedWords}
                value={inputWords}
                onChange={(words) => onSeedWordsChange(words)}
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
                history.push({ pathname: doneLink })
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
                // reminder view in app
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
                    <SeedPhraseBlock
                        isReminder={true}
                        verificationError={verificationError}
                        seedWords={seedWords}
                        inputWords={inputWords}
                        onSeedWordsChange={(words: any) => setInputWords(words)}
                    />
                </PopupLayout>
            ) : (
                // browser tab version during installation
                <PageLayout
                    screen={isReminder}
                    header={!isReminder}
                    maxWidth={isReminder ? "" : "max-w-md"}
                    className={"text-center"}
                >
                    <span className="font-semibold my-6   text-lg">
                        Confirm Secret Phrase
                    </span>
                    <Divider />
                    <SeedPhraseBlock
                        isReminder={isReminder}
                        verificationError={verificationError}
                        seedWords={seedWords}
                        inputWords={inputWords}
                        onSeedWordsChange={(words: any) => setInputWords(words)}
                    />
                    <Divider />

                    <div className="flex flex-row w-full p-6 justify-between">
                        <Link
                            to={{
                                pathname: backLink,
                                state: { seedPhrase, password },
                            }}
                            className={Classes.liteButton}
                            draggable={false}
                            style={{ maxWidth: "170px" }}
                        >
                            Back
                        </Link>
                        <button
                            type="button"
                            className={classnames(
                                Classes.button,
                                "font-bold border-2 border-primary-blue-default max-w-[170px]",
                                (!isPhraseValid() ||
                                    isVerificationInProgress) &&
                                    "opacity-50 pointer-events-none"
                            )}
                            onClick={confirmSeedPhrase}
                        >
                            {!isVerificationInProgress ? (
                                "Confirm"
                            ) : (
                                <Spinner />
                            )}
                        </button>
                    </div>
                </PageLayout>
            )}
        </IdleComponent>
    )
}

export default BackupConfirmPage
