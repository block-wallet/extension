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
    FieldValues,
} from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import log from "loglevel"
import InfoTip from "../label/InfoTip"
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

// NEW: Define the hook props interface
interface UseSeedImportFormProps {
    action: (password: string, seedPhrase: string) => Promise<any>
}

// NEW: Define the return type for the hook
interface UseSeedImportFormReturn {
    // Use specific react-hook-form types with the form data generic
    register: UseFormRegister<SeedImportFormData>
    handleSubmit: UseFormHandleSubmit<SeedImportFormData>
    formState: FormState<SeedImportFormData>
    trigger: UseFormTrigger<SeedImportFormData>
    watch: UseFormWatch<SeedImportFormData>
    setError: UseFormSetError<SeedImportFormData>

    // Component specific state
    passwordScore: number
    setPasswordScore: React.Dispatch<React.SetStateAction<number>>
    numberOfWords: number
    setNumberOfWords: React.Dispatch<React.SetStateAction<number>>
    seedPhrase: string[]
    seedPhraseError: string
    isLoading: boolean
    isImportDisabled: boolean

    // Handlers
    onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>
    onSeedPhraseWordChange: (wordN: number, word: string) => void
    onSeedPhrasePaste: (pastedSP: string) => void
    numberOfWordsOptions: number[]

    // NEW: Add state for individual word errors
    wordErrors: boolean[]
}

// NEW: Custom hook implementation
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
    // NEW: State to track errors per word input
    const [wordErrors, setWordErrors] = useState<boolean[]>(
        new Array(numberOfWordsOptions[0]).fill(false)
    )

    const { register, handleSubmit, setError, trigger, watch, formState } =
        useForm<SeedImportFormData>({
            mode: "onChange",
            resolver: yupResolver(schema),
        })

    // Adjust seedPhrase array length when numberOfWords changes
    useEffect(() => {
        setSeedPhrase((prevSeedPhrase) => {
            const newSeedPhrase = new Array(numberOfWords).fill("")
            // Preserve existing words if possible
            for (let i = 0; i < Math.min(prevSeedPhrase.length, numberOfWords); i++) {
                newSeedPhrase[i] = prevSeedPhrase[i]
            }
            return newSeedPhrase
        })
        // Reset error when length changes
        setSeedPhraseError("")
        // NEW: Reset word errors array when length changes
        setWordErrors(new Array(numberOfWords).fill(false))
    }, [numberOfWords])


    const onSeedPhraseChange = useCallback(
        (newSP: string[]) => {
            setSeedPhrase(newSP) // Update state first

            const hasContent = newSP.some((word: string) => word !== "")
            let phraseLevelError = "" // Use a local var for phrase errors
            let foundWordError = false
            const newWordErrors = new Array(newSP.length).fill(false) // Start fresh

            if (hasContent) {
                // Check individual words
                for (let i = 0; i < newSP.length; i++) {
                    const word = newSP[i]
                    if (word && wordlists.en.getWordIndex(word) === -1) {
                        newWordErrors[i] = true
                        foundWordError = true
                    }
                }

                // If any word is invalid, show a generic message at phrase level for now
                // Alternatively, we could rely solely on highlighting the fields
                if (foundWordError) {
                    phraseLevelError = "One or more words are invalid"
                }

                // Only check phrase validity if no individual word errors were found
                if (!foundWordError) {
                    const isComplete = !newSP.some((word: string) => word === "")
                    if (!isComplete) {
                        phraseLevelError = "Enter the full seed phrase"
                    } else {
                        const joinedSP = newSP.join(" ")
                        if (!isValidMnemonic(joinedSP)) {
                            phraseLevelError = "Seed phrase is invalid (check words and order)"
                        }
                        // If we reach here, the phrase is complete and valid
                    }
                }
            }
            // Update states
            setWordErrors(newWordErrors)
            setSeedPhraseError(phraseLevelError)
        },
        [setSeedPhrase, setSeedPhraseError, setWordErrors] // Added setWordErrors dependency
    )


    const onSeedPhraseWordChange = useCallback(
        (wordN: number, word: string) => {
            const newSP = seedPhrase.slice()
            newSP[wordN] = word.trim().toLowerCase() // Ensure words are lowercase
            onSeedPhraseChange(newSP)
        },
        [seedPhrase, onSeedPhraseChange]
    )

    const onSeedPhrasePaste = useCallback(
        (pastedSP: string) => {
            const parsedSP =
                pastedSP.trim().toLowerCase().match(/[a-z]+/g)?.join(" ") || "" // Match only words, removed 'u' flag

            if (!parsedSP) {
                setSeedPhraseError("Pasted text does not contain a valid phrase.")
                return
            }

            let newSP = parsedSP.split(" ")
            let newNumberOfWords = numberOfWordsOptions[0] // Default to 12

            // Determine the correct number of words based on pasted length
            const validLengths = numberOfWordsOptions
            let foundLength = false
            for (const len of validLengths) {
                if (newSP.length === len) {
                    newNumberOfWords = len
                    foundLength = true
                    break
                }
            }

            // If length is not standard (12, 15, 18, 21, 24), try to find nearest valid length > length
            // Or handle as error / provide feedback? For now, let's default to nearest valid length or 12
            if (!foundLength) {
                if (newSP.length < 12) {
                    newNumberOfWords = 12;
                    setSeedPhraseError("Pasted phrase is too short. Expected 12, 15, 18, 21, or 24 words.");
                } else if (newSP.length > 24) {
                    newSP = newSP.slice(0, 24); // Truncate if too long
                    newNumberOfWords = 24;
                    setSeedPhraseError("Pasted phrase is too long. Truncated to 24 words.");
                } else {
                    // Find the next valid length up
                    for (const len of validLengths) {
                        if (len > newSP.length) {
                            newNumberOfWords = len;
                            break;
                        }
                    }
                    // Default to 24 if somehow still not found (shouldn't happen)
                    if (!newNumberOfWords) newNumberOfWords = 24;
                    setSeedPhraseError(`Pasted phrase has ${newSP.length} words. Adjusted to ${newNumberOfWords} words.`);
                }

            } else {
                setSeedPhraseError("") // Clear error if length is valid
            }


            // Update the number of words state, which will trigger useEffect to resize array
            setNumberOfWords(newNumberOfWords)

            // Pad or truncate the pasted phrase to match the determined number of words
            if (newSP.length < newNumberOfWords) {
                newSP = newSP.concat(
                    new Array(newNumberOfWords - newSP.length).fill("")
                )
            } else if (newSP.length > newNumberOfWords) {
                newSP = newSP.slice(0, newNumberOfWords)
            }


            // Call onSeedPhraseChange with the processed array
            // Use timeout to ensure numberOfWords state update happens first
            setTimeout(() => onSeedPhraseChange(newSP), 0)
        },
        [onSeedPhraseChange, setNumberOfWords]
    )


    const onSubmit = handleSubmit(async (data: SeedImportFormData) => {
        // Check password strength before submitting
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
            return // Stop submission
        }

        // Re-validate seed phrase just before submission
        const joinedSP = seedPhrase.join(" ")
        if (!isValidMnemonic(joinedSP)) {
            setSeedPhraseError("Seed phrase invalid")
            return // Stop submission
        }
        // Clear error if valid
        setSeedPhraseError("")


        setIsLoading(true)
        try {
            const { password } = data
            await action(password, joinedSP)
        } catch (error) {
            log.error(error.message || error)
            // Set a more specific error if possible, otherwise generic
            const errorMessage =
                error instanceof Error ? error.message : "Error importing seed phrase"
            setSeedPhraseError(errorMessage) // Display backend errors related to the phrase here
            // Potentially set form-level error for password issues etc.
            // setError("root.serverError", { message: "An unexpected error occurred during import." });
        } finally {
            setIsLoading(false)
        }
    })

    const passwordValues = watch() // Watch all form values

    // Effect to enable/disable import button
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


    // Effect to trigger password confirmation validation when password changes
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
        wordErrors, // Return the new state
    }
}

// Interface for the component props remains the same
interface SeedImportProps {
    buttonLabel: string
    action: (password: string, seedPhrase: string) => Promise<any>
}


const SeedImport: FunctionComponent<SeedImportProps> = ({
    buttonLabel = "Import",
    action,
}) => {
    // Use the custom hook
    const {
        register,
        handleSubmit, // Note: We use the onSubmit from the hook directly
        formState,
        trigger, // Keep trigger if needed directly in component, though likely handled by hook
        watch, // Keep watch if needed directly in component
        setError, // Keep setError if needed directly in component
        passwordScore, // Needed for PasswordInput strengthBar
        setPasswordScore, // Needed for PasswordInput
        numberOfWords,
        setNumberOfWords, // Needed for Select
        seedPhrase, // Needed for rendering inputs
        seedPhraseError, // Needed for error display
        isLoading, // Needed for button state/spinner
        isImportDisabled, // Needed for button state
        onSubmit, // Use the hook's onSubmit
        onSeedPhraseWordChange, // Needed for input onChange
        onSeedPhrasePaste, // Needed for input onPaste
        numberOfWordsOptions, // Needed for Select options
        wordErrors, // Get the word error state from hook
    } = useSeedImportForm({ action })

    const passwordConfirmationWatch = watch("passwordConfirmation") // Still needed for immediate feedback? Hook handles trigger.

    // Effect for password confirmation trigger (already in hook, potentially remove duplicate watch here if not used otherwise)
    /*
    const passwordValues = watch()
    useEffect(() => {
        if (passwordValues.password && passwordValues.passwordConfirmation) {
            trigger("passwordConfirmation")
        }
    }, [passwordValues.password, passwordValues.passwordConfirmation, trigger])
    */


    return (
        <form
            className="flex flex-col w-full text-primary-grey-dark"
            onSubmit={onSubmit} // Use onSubmit from hook
            noValidate // Prevent browser validation, rely on react-hook-form
        >
            <div className="flex flex-col px-6 space-y-4">
                {/* Seed Phrase Length Selection */}
                <div className="flex flex-col space-y-2">
                    <Select
                        onChange={(value) => setNumberOfWords(Number(value))} // Ensure value is number
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

                {/* Seed Phrase Input Area */}
                <div className="flex flex-col space-y-2">
                    <InfoTip
                        text="You can paste your entire seed phrase into any field."
                        fontSize="text-xs"
                    />
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2"> {/* Adjusted grid for responsiveness */}
                        {Array.from({ length: numberOfWords }, (_, i) => {
                            const wordNumber = i + 1
                            return (
                                <PasswordInput // Using PasswordInput to obscure words
                                    key={`word_${i}`}
                                    placeholder={`#${wordNumber}`} // Simplified placeholder
                                    name={`word_${i}`} // Name might not be needed if not registered with RHF
                                    value={seedPhrase[i]}
                                    onChange={(e: any) => {
                                        // No preventDefault needed unless it causes issues
                                        onSeedPhraseWordChange(i, e.target.value)
                                    }}
                                    onPaste={(e: any) => {
                                        const pastedText =
                                            e.clipboardData.getData("text")
                                        // Basic check if pasted text contains spaces (likely multi-word)
                                        if (pastedText.trim().includes(" ")) {
                                            e.preventDefault() // Prevent default paste into single field
                                            onSeedPhrasePaste(pastedText)
                                        }
                                        // Allow single word paste without prevention
                                    }}
                                    // Pass the phrase-level error message only if this specific word is invalid
                                    error={wordErrors[i] ? seedPhraseError : undefined}
                                // Removed register as we handle seed phrase state separately
                                // inputClassName="text-center" // Removed invalid prop
                                />
                            )
                        })}
                    </div>
                    {/* Display Seed Phrase Error */}
                    <span className="text-xs text-red-500 h-4"> {/* Fixed height for layout stability */}
                        {seedPhraseError || <>&nbsp;</>}
                    </span>
                </div>

                {/* Password Inputs */}
                <div className="flex flex-col space-y-4"> {/* Group password fields */}
                    <PasswordInput
                        label="New Password"
                        placeholder="Enter New Password"
                        {...register("password")} // Register with react-hook-form
                        error={formState.errors.password?.message}
                        strengthBar={true}
                        setPasswordScore={setPasswordScore} // Pass setter from hook
                    />
                    <PasswordInput
                        label="Confirm Password"
                        placeholder="Confirm New Password"
                        {...register("passwordConfirmation")} // Register with react-hook-form
                        error={formState.errors.passwordConfirmation?.message}
                    />
                </div>


                {/* Terms of Use Checkbox */}
                <div className="flex flex-col space-y-1">
                    <div className="flex flex-row items-center space-x-2">
                        <input
                            type="checkbox"
                            className={Classes.checkbox}
                            id="acceptTOU"
                            {...register("acceptTOU")} // Register with react-hook-form
                        />
                        <label htmlFor="acceptTOU" className="text-xs">
                            I have read and agree to the{" "}
                            <a
                                href="https://blockwallet.io/terms-of-use-of-block-wallet.html"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-blue-default hover:underline" // Added hover effect
                            >
                                Terms of Use
                            </a>
                        </label>
                    </div>
                    {/* Display TOU Error */}
                    <span className="text-xs text-red-500 h-4"> {/* Fixed height */}
                        {formState.errors.acceptTOU?.message || <>&nbsp;</>}
                    </span>
                </div>
            </div>

            {/* Divider and Action Buttons */}
            <Divider />
            <div className="flex flex-row p-6 space-x-4">
                <LinkButton
                    location="/setup/" // Consider making this dynamic or passed as prop if needed elsewhere
                    text="Back"
                    lite
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    className={classnames(
                        Classes.button,
                        "w-1/2 font-semibold border-2 border-primary-blue-default",
                        isImportDisabled && "opacity-50 cursor-not-allowed", // Simplified disabled style
                        isLoading && "opacity-75 cursor-wait" // Added loading style
                    )}
                    disabled={isImportDisabled || isLoading} // Use state from hook
                >
                    {isLoading ? <Spinner size="sm" /> : buttonLabel} {/* Use smaller spinner */}
                </button>
            </div>
        </form>
    )
}

export default SeedImport


