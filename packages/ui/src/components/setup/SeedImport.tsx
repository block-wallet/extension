import { FunctionComponent, useCallback, useEffect, useState } from "react"
import { Classes, classnames } from "../../styles"
import LinkButton from "../button/LinkButton"
import Divider from "../Divider"
import PasswordInput from "../input/PasswordInput"
import Spinner from "../spinner/Spinner"
import * as yup from "yup"
import { isValidMnemonic } from "@ethersproject/hdnode"
import { useForm } from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import log from "loglevel"
import InfoTip from "../label/InfoTip"
import Select from "../input/Select"

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

const SeedImport: FunctionComponent<{
    buttonLabel: string
    action: (password: string, seedPhrase: string) => Promise<any>
}> = ({ buttonLabel = "Import", action }) => {
    const [passwordScore, setPasswordScore] = useState<number>(0)
    const [numberOfWords, setNumberOfWords] = useState<number>(
        numberOfWordsOptions[0]
    )
    const [seedPhrase, setSeedPhrase] = useState(
        new Array(numberOfWordsOptions[0]).fill("")
    )
    const [seedPhraseError, setSeedPhraseError] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isImportDisabled, setIsImportDisabled] = useState(true)
    const { register, handleSubmit, setError, trigger, watch, formState } =
        useForm<SeedImportFormData>({
            mode: "onChange",
            resolver: yupResolver(schema),
        })

    const passwordConfirmationWatch = watch("passwordConfirmation")
    const onSubmit = handleSubmit(async (data: SeedImportFormData) => {
        try {
            if (passwordScore < 3) {
                return setError(
                    "password",
                    {
                        message: "Password is not strong enough",
                    },
                    {
                        shouldFocus: true,
                    }
                )
            }

            if (!isValidMnemonic(seedPhrase.join(" "))) {
                return setSeedPhraseError("Seed phrase invalid")
            }

            setIsLoading(true)

            const { password } = data

            await action(password, seedPhrase.join(" "))
        } catch (error) {
            log.error(error.message || error)

            setSeedPhraseError("Error importing seed phrase")
        } finally {
            setIsLoading(false)
        }
    })

    const onSeedPhraseChange = useCallback(
        (newSP: string[]) => {
            if (newSP.some((word: string) => word !== "")) {
                if (newSP.some((word: string) => word === "")) {
                    setSeedPhraseError("Enter the full seed phrase")
                } else if (!isValidMnemonic(newSP.join(" "))) {
                    setSeedPhraseError("Seed phrase invalid")
                } else {
                    setSeedPhraseError("")
                }
            }
            setSeedPhrase(newSP)
        },
        [setSeedPhrase, setSeedPhraseError]
    )

    const onSeedPhraseWordChange = useCallback(
        (wordN: number, word: string) => {
            const newSP = seedPhrase.slice()
            newSP[wordN] = word.trim()
            onSeedPhraseChange(newSP)
        },
        [seedPhrase, onSeedPhraseChange]
    )

    const onSeedPhrasePaste = useCallback(
        (pastedSP: string) => {
            const parsedSP =
                pastedSP.trim().toLowerCase().match(/\w+/gu)?.join(" ") || ""

            let newSP = parsedSP.split(" ")
            let newNumberOfWords = numberOfWords
            if (newSP.length !== numberOfWords) {
                if (newSP.length < 12) {
                    newNumberOfWords = 12
                } else if (newSP.length % 3 === 0) {
                    newNumberOfWords = newSP.length
                } else {
                    newNumberOfWords = newSP.length + (3 - (newSP.length % 3))
                }
                setNumberOfWords(newNumberOfWords)
            }

            if (newSP.length < newNumberOfWords) {
                newSP = newSP.concat(
                    new Array(newNumberOfWords - newSP.length).fill("")
                )
            }

            onSeedPhraseChange(newSP)
        },
        [numberOfWords, onSeedPhraseChange]
    )

    const passwordValues = watch()
    useEffect(() => {
        if (
            seedPhrase &&
            !seedPhraseError &&
            seedPhrase.filter((s) => s !== "").length === numberOfWords &&
            formState.isValid
        ) {
            setIsImportDisabled(false)
        } else {
            setIsImportDisabled(true)
        }
    }, [seedPhrase, passwordValues, seedPhraseError, formState.errors.password])

    useEffect(() => {
        // trigger password confirmation validation when password changes given that there is a value in both fields
        if (passwordValues.password && passwordValues.passwordConfirmation) {
            trigger("passwordConfirmation")
        }
    }, [passwordValues.password, trigger])

    return (
        <form
            className="flex flex-col w-full text-primary-grey-dark"
            onSubmit={onSubmit}
        >
            <div className="flex flex-col px-6 space-y-4">
                <div className="flex flex-col space-y-2">
                    <div className="flex flex-col space-y-1">
                        <Select
                            onChange={setNumberOfWords}
                            currentValue={numberOfWords}
                            id="numberOfWords"
                            label="Seed phrase length"
                        >
                            {numberOfWordsOptions.map(
                                (numberOfWords: number) => {
                                    return (
                                        <Select.Option
                                            value={numberOfWords}
                                            key={numberOfWords}
                                        >
                                            {`${numberOfWords}-word Seed Phrase`}
                                        </Select.Option>
                                    )
                                }
                            )}
                        </Select>
                    </div>
                    <div className="flex flex-col space-y-1">
                        <InfoTip
                            text="You can paste your entire seed phrase into any field."
                            fontSize="text-xs"
                        />
                    </div>
                    <div className="flex flex-col space-y-1">
                        <div className="grid grid-cols-4 gap-2">
                            {Array.from({ length: numberOfWords }, (v, i) => {
                                const wordnN = i + 1
                                return (
                                    <PasswordInput
                                        key={`word_${i}`}
                                        placeholder={`Enter word #${wordnN}`}
                                        name={`word_${i}`}
                                        //register={register}
                                        value={seedPhrase[i]}
                                        onChange={(e: any) => {
                                            e.preventDefault()
                                            onSeedPhraseWordChange(
                                                i,
                                                e.target.value
                                            )
                                        }}
                                        onPaste={(e: any) => {
                                            const newSP =
                                                e.clipboardData.getData("text")

                                            if (newSP.trim().match(/\s/u)) {
                                                e.preventDefault()
                                                onSeedPhrasePaste(newSP)
                                            }
                                        }}
                                    />
                                )
                            })}
                        </div>
                        <span className="text-xs text-red-500">
                            {seedPhraseError || <>&nbsp;</>}
                        </span>
                    </div>
                </div>
                <div className="flex flex-col space-y-1">
                    <PasswordInput
                        label="New Password"
                        placeholder="Enter New Password"
                        {...register("password", {
                            onChange: () => {
                                passwordConfirmationWatch &&
                                    trigger("passwordConfirmation")
                            },
                        })}
                        error={formState.errors.password?.message}
                        strengthBar={true}
                        setPasswordScore={setPasswordScore}
                    />
                </div>
                <div className="flex flex-col space-y-1">
                    <PasswordInput
                        label="Confirm Password"
                        placeholder="Confirm New Password"
                        {...register("passwordConfirmation")}
                        error={formState.errors.passwordConfirmation?.message}
                    />
                </div>
                <div className="flex flex-col space-y-1">
                    <div className="flex flex-row items-center space-x-2">
                        <input
                            type="checkbox"
                            className={Classes.checkbox}
                            id="acceptTOU"
                            {...register("acceptTOU")}
                        />
                        <label htmlFor="acceptTOU" className="text-xs">
                            I have read and agree to the{" "}
                            <a
                                href="https://blockwallet.io/terms-of-use-of-block-wallet.html"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-blue-default"
                            >
                                Terms of Use
                            </a>
                        </label>
                    </div>
                    <span className="text-xs text-red-500">
                        {formState.errors.acceptTOU?.message || <>&nbsp;</>}
                    </span>
                </div>
            </div>
            <Divider />
            <div className="flex flex-row p-6 space-x-4">
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
                        "w-1/2 font-semibold border-2 border-primary-blue-default",
                        (isLoading || isImportDisabled) &&
                            "opacity-50 pointer-events-none"
                    )}
                    disabled={isImportDisabled || isLoading}
                >
                    {!isLoading ? buttonLabel : <Spinner />}
                </button>
            </div>
        </form>
    )
}

export default SeedImport
