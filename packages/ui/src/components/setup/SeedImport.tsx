import { FunctionComponent, useCallback, useEffect, useState } from "react"
import { Classes, classnames } from "../../styles"
import LinkButton from "../button/LinkButton"
import Divider from "../Divider"
import PasswordInput from "../input/PasswordInput"
import Spinner from "../spinner/Spinner"
import * as yup from "yup"
import { isValidMnemonic } from "@ethersproject/hdnode"
import {
    useForm,
    UseFormRegister,
    UseFormHandleSubmit,
    FormState,
    UseFormTrigger,
    UseFormWatch,
    UseFormSetError,
} from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import log from "loglevel"
import Select from "../input/Select"
import { wordlists } from "@ethersproject/wordlists"

const schema = yup.object().shape({
    password: yup
        .string()
        .required("No password provided.")
        .min(8, "Password should be at least 8 characters long.")
        .matches(
            /(?=.*\d)(?=.*[a-z])/,
            "Password must contain at least one lowercase character and one digit."
        ),
    passwordConfirmation: yup
        .string()
        .required("Please enter the password confirmation.")
        .oneOf(
            [yup.ref("password"), null],
            "Password and password confirmation must match."
        ),
    acceptTOU: yup
        .bool()
        .required("You must accept the Terms of Use.")
        .oneOf([true], "You must accept the Terms of Use."),
})
type SeedImportFormData = {
    password: string
    passwordConfirmation: string
    acceptTOU: boolean
}

const numberOfWordsOptions: number[] = []
for (let i = 12; i <= 24; i += 3) {
    numberOfWordsOptions.push(i)
}

interface UseSeedImportFormProps {
    action: (password: string, seedPhrase: string) => Promise<any>
}

interface UseSeedImportFormReturn {
    register: UseFormRegister<SeedImportFormData>
    handleSubmit: UseFormHandleSubmit<SeedImportFormData>
    formState: FormState<SeedImportFormData>
    trigger: UseFormTrigger<SeedImportFormData>
    watch: UseFormWatch<SeedImportFormData>
    setError: UseFormSetError<SeedImportFormData>

    passwordScore: number
    setPasswordScore: React.Dispatch<React.SetStateAction<number>>
    numberOfWords: number
    setNumberOfWords: React.Dispatch<React.SetStateAction<number>>
    seedPhrase: string[]
    seedPhraseError: string
    isLoading: boolean
    isImportDisabled: boolean

    onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>
    onSeedPhraseWordChange: (wordN: number, word: string) => void
    onSeedPhrasePaste: (pastedSP: string) => void
    numberOfWordsOptions: number[]

    wordErrors: boolean[]
}

const useSeedImportForm = ({
    action,
}: UseSeedImportFormProps): UseSeedImportFormReturn => {
    const [passwordScore, setPasswordScore] = useState<number>(0)
    const [numberOfWords, setNumberOfWords] = useState<number>(
        numberOfWordsOptions[0]
    )
    const [seedPhrase, setSeedPhrase] = useState<string[]>(
        new Array(numberOfWordsOptions[0]).fill("")
    )
    const [seedPhraseError, setSeedPhraseError] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isImportDisabled, setIsImportDisabled] = useState(true)
    const [wordErrors, setWordErrors] = useState<boolean[]>(
        new Array(numberOfWordsOptions[0]).fill(false)
    )

    const { register, handleSubmit, setError, trigger, watch, formState } =
        useForm<SeedImportFormData>({
            mode: "onChange",
            resolver: yupResolver(schema),
        })

    useEffect(() => {
        setSeedPhrase((prevSeedPhrase) => {
            const newSeedPhrase = new Array(numberOfWords).fill("")
            for (let i = 0; i < Math.min(prevSeedPhrase.length, numberOfWords); i++) {
                newSeedPhrase[i] = prevSeedPhrase[i]
            }
            return newSeedPhrase
        })
        setSeedPhraseError("")
        setWordErrors(new Array(numberOfWords).fill(false))
    }, [numberOfWords])


    const onSeedPhraseChange = useCallback(
        (newSP: string[]) => {
            setSeedPhrase(newSP)

            const hasContent = newSP.some((word: string) => word !== "")
            let phraseLevelError = ""
            let foundWordError = false
            const newWordErrors = new Array(newSP.length).fill(false)

            if (hasContent) {
                for (let i = 0; i < newSP.length; i++) {
                    const word = newSP[i]
                    if (word && wordlists.en.getWordIndex(word) === -1) {
                        newWordErrors[i] = true
                        foundWordError = true
                    }
                }

                if (foundWordError) {
                    phraseLevelError = "One or more words are invalid"
                }

                if (!foundWordError) {
                    const isComplete = !newSP.some((word: string) => word === "")
                    if (!isComplete) {
                        phraseLevelError = "Enter the full seed phrase"
                    } else {
                        const joinedSP = newSP.join(" ")
                        if (!isValidMnemonic(joinedSP)) {
                            phraseLevelError = "Seed phrase is invalid (check words and order)"
                        }
                    }
                }
            }
            setWordErrors(newWordErrors)
            setSeedPhraseError(phraseLevelError)
        },
        [setSeedPhrase, setSeedPhraseError, setWordErrors]
    )


    const onSeedPhraseWordChange = useCallback(
        (wordN: number, word: string) => {
            const newSP = seedPhrase.slice()
            newSP[wordN] = word.trim().toLowerCase()
            onSeedPhraseChange(newSP)
        },
        [seedPhrase, onSeedPhraseChange]
    )

    const onSeedPhrasePaste = useCallback(
        (pastedSP: string) => {
            const parsedSP =
                pastedSP.trim().toLowerCase().match(/[a-z]+/g)?.join(" ") || ""

            if (!parsedSP) {
                setSeedPhraseError("Pasted text does not contain a valid phrase.")
                return
            }

            let tempSPArray = parsedSP.split(" ")
            let newNumberOfWords = numberOfWordsOptions[0]
            let errorMsg = ""

            const validLengths = numberOfWordsOptions
            let foundLength = false
            for (const len of validLengths) {
                if (tempSPArray.length === len) {
                    newNumberOfWords = len
                    foundLength = true
                    break
                }
            }

            if (!foundLength) {
                if (tempSPArray.length < 12) {
                    newNumberOfWords = 12;
                    errorMsg = "Pasted phrase is too short. Expected 12, 15, 18, 21, or 24 words.";
                } else if (tempSPArray.length > 24) {
                    newNumberOfWords = 24;
                    errorMsg = "Pasted phrase is too long. Limited to 24 words.";
                } else {
                    for (const len of validLengths) {
                        if (len > tempSPArray.length) {
                            newNumberOfWords = len;
                            break;
                        }
                    }
                    if (!newNumberOfWords) newNumberOfWords = 24;
                    errorMsg = `Pasted phrase has ${tempSPArray.length} words. Adjusted field count to ${newNumberOfWords}.`;
                }
            }
            setSeedPhraseError(errorMsg)

            let processedSP = new Array(newNumberOfWords).fill("")
            for (let i = 0; i < newNumberOfWords; i++) {
                if (i < tempSPArray.length) {
                    processedSP[i] = tempSPArray[i];
                } else {
                    processedSP[i] = "";
                }
            }

            setNumberOfWords(newNumberOfWords)
            onSeedPhraseChange(processedSP)
        },
        [onSeedPhraseChange, setNumberOfWords, setSeedPhraseError]
    )


    const onSubmit = handleSubmit(async (data: SeedImportFormData) => {
        if (passwordScore < 3) {
            setError(
                "password",
                {
                    message: "Password is not strong enough",
                },
                {
                    shouldFocus: true,
                }
            )
            return
        }

        const joinedSP = seedPhrase.join(" ")
        if (!isValidMnemonic(joinedSP)) {
            setSeedPhraseError("Seed phrase invalid")
            return
        }
        setSeedPhraseError("")


        setIsLoading(true)
        try {
            const { password } = data
            await action(password, joinedSP)
        } catch (error) {
            log.error(error.message || error)
            const errorMessage =
                error instanceof Error ? error.message : "Error importing seed phrase"
            setSeedPhraseError(errorMessage)
        } finally {
            setIsLoading(false)
        }
    })

    const passwordValues = watch()

    useEffect(() => {
        const isSeedPhraseCompleteAndValid =
            seedPhrase.length === numberOfWords &&
            !seedPhrase.some((s) => s === "") &&
            !seedPhraseError

        setIsImportDisabled(
            !isSeedPhraseCompleteAndValid || !formState.isValid || isLoading
        )
    }, [
        seedPhrase,
        numberOfWords,
        seedPhraseError,
        formState.isValid,
        isLoading,
    ])


    useEffect(() => {
        const password = passwordValues.password
        const passwordConfirmation = passwordValues.passwordConfirmation
        if (password && passwordConfirmation) {
            trigger("passwordConfirmation")
        }
    }, [passwordValues.password, passwordValues.passwordConfirmation, trigger])


    return {
        register,
        handleSubmit,
        formState,
        trigger,
        watch,
        setError,
        passwordScore,
        setPasswordScore,
        numberOfWords,
        setNumberOfWords,
        seedPhrase,
        seedPhraseError,
        isLoading,
        isImportDisabled,
        onSubmit,
        onSeedPhraseWordChange,
        onSeedPhrasePaste,
        numberOfWordsOptions,
        wordErrors,
    }
}

interface SeedImportProps {
    buttonLabel: string
    action: (password: string, seedPhrase: string) => Promise<any>
}


const SeedImport: FunctionComponent<SeedImportProps> = ({
    buttonLabel = "Import",
    action,
}) => {
    const {
        register,
        formState,
        setPasswordScore,
        numberOfWords,
        setNumberOfWords,
        seedPhrase,
        seedPhraseError,
        isLoading,
        isImportDisabled,
        onSubmit,
        onSeedPhraseWordChange,
        onSeedPhrasePaste,
        numberOfWordsOptions,
        wordErrors,
    } = useSeedImportForm({ action })

    const handleSeedCellPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const pastedText = e.clipboardData.getData("text");
        if (!pastedText) return;
        if (/[\s\n\t]/.test(pastedText)) {
            e.preventDefault();
            onSeedPhrasePaste(pastedText);
        }
    };



    return (
        <form
            className="flex flex-col w-full text-primary-grey-dark"
            onSubmit={onSubmit}
            noValidate
        >
            <div className="flex flex-col px-4 space-y-3">
                <div className="flex flex-col space-y-2 md:max-w-xs">
                    <Select
                        onChange={(value) => setNumberOfWords(Number(value))}
                        currentValue={numberOfWords}
                        id="numberOfWords"
                        label="Seed phrase length"
                    >
                        {numberOfWordsOptions.map((numWords: number) => (
                            <Select.Option value={numWords} key={numWords}>
                                {`${numWords}-word Seed Phrase`}
                            </Select.Option>
                        ))}
                    </Select>
                </div>

                <div className="flex flex-col space-y-1.5">
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
                        {Array.from({ length: numberOfWords }, (_, i) => {
                            const wordNumber = i + 1
                            return (
                                <PasswordInput
                                    key={`word_${i}`}
                                    placeholder={`#${wordNumber}`}
                                    name={`word_${i}`}
                                    value={seedPhrase[i]}
                                    onChange={(e: any) => {
                                        onSeedPhraseWordChange(i, e.target.value)
                                    }}
                                    onPaste={handleSeedCellPaste}
                                    error={wordErrors[i] ? seedPhraseError : undefined}
                                />
                            )
                        })}
                    </div>
                    <span className="text-xs text-red-500 h-3">
                        {seedPhraseError || <>&nbsp;</>}
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <PasswordInput
                        label="New Password"
                        placeholder="Enter New Password"
                        {...register("password")}
                        error={formState.errors.password?.message}
                        strengthBar={true}
                        setPasswordScore={setPasswordScore}
                    />
                    <PasswordInput
                        label="Confirm Password"
                        placeholder="Confirm New Password"
                        {...register("passwordConfirmation")}
                        error={formState.errors.passwordConfirmation?.message}
                    />
                </div>


                <div className="flex flex-col space-y-0.5">
                    <div className="flex flex-row items-center space-x-2">
                        <input
                            type="checkbox"
                            className={Classes.checkbox}
                            id="acceptTOU"
                            {...register("acceptTOU")}
                        />
                        <label htmlFor="acceptTOU" className="text-xs">
                            I agree to the{" "}
                            <a
                                href="https://blockwallet.io/terms-of-use-of-block-wallet.html"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-blue-default hover:underline"
                            >
                                Terms of Use
                            </a>
                        </label>
                    </div>
                    <span className="text-xs text-red-500 h-3">
                        {formState.errors.acceptTOU?.message || <>&nbsp;</>}
                    </span>
                </div>
            </div>

            <Divider />
            <div className="flex flex-row p-4 space-x-4">
                <LinkButton
                    location="/setup/"
                    text="Back"
                    lite
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    className={classnames(
                        Classes.button,
                        "w-full md:w-1/2 font-semibold border-2 border-primary-blue-default",
                        isImportDisabled && "opacity-50 cursor-not-allowed",
                        isLoading && "opacity-75 cursor-wait"
                    )}
                    disabled={isImportDisabled || isLoading}
                >
                    {isLoading ? <Spinner size="sm" /> : buttonLabel}
                </button>
            </div>
        </form>
    )
}

export default SeedImport


