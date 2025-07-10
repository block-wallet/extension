import { useEffect, useState } from "react"
import { useHistory } from "react-router-dom"
import * as yup from "yup"
import { yupResolver } from "@hookform/resolvers/yup"
import { useForm } from "react-hook-form"

// Components
import PopupHeader from "../components/popup/PopupHeader"
import PopupLayout from "../components/popup/PopupLayout"
import PopupFooter from "../components/popup/PopupFooter"
import ClickToReveal from "../components/label/ClickToReveal"
import { ButtonWithLoading } from "../components/button/ButtonWithLoading"
import PasswordInput from "../components/input/PasswordInput"

// Comms
import { useBlankState } from "../context/background/backgroundHooks"
import getRequestRouteAndStatus from "../context/util/getRequestRouteAndStatus"
import { verifyPassword, requestSeedPhrase } from "../context/commActions"
import log from "loglevel"

const schema = yup.object().shape({
    password: yup.string().required("Password required."),
})
type PasswordFormData = { password: string }

const ReminderPage = () => {
    const history: any = useHistory()
    const [revealed, setRevealed] = useState<boolean>(false)
    const [seedPhrase, setSeedPhrase] = useState<string | undefined>("")
    const [password, setPassword] = useState<string | undefined>("")

    const hasBack = history.location.state?.hasBack ?? true

    const { permissionRequests, unapprovedTransactions, dappRequests } =
        useBlankState()!

    const [showRequests, requestRoute] = getRequestRouteAndStatus(
        permissionRequests,
        unapprovedTransactions,
        dappRequests
    )

    const {
        register,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<PasswordFormData>({
        resolver: yupResolver(schema),
    })

    const onSubmit = handleSubmit((data) => {
        verifyPassword(data.password)
            .then(async (isValid) => {
                if (!isValid)
                    return setError(
                        "password",
                        {
                            message: "Incorrect password",
                        },
                        {
                            shouldFocus: true,
                        }
                    )

                const seedPhrase = await requestSeedPhrase(data.password)

                setPassword(data.password)
                setSeedPhrase(seedPhrase)
            })
            .catch(log.error)
    })

    useEffect(() => {
        setSeedPhrase(history.location?.state?.seedPhrase)
        setPassword(history.location?.state?.password)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const shouldEnterPassword = !seedPhrase || !password

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="You Haven't Set Up a Backup"
                    backButton={hasBack}
                    close={showRequests ? requestRoute : undefined}
                />
            }
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        disabled={!shouldEnterPassword && !revealed}
                        label={shouldEnterPassword ? "Next" : "Backup now"}
                        onClick={() => {
                            if (shouldEnterPassword) {
                                onSubmit()
                                return
                            }

                            history.push({
                                pathname: "/reminder/backup",
                                state: {
                                    seedPhrase,
                                    isReminder: true,
                                    password,
                                },
                            })
                        }}
                    />
                </PopupFooter>
            }
            submitOnEnter={{
                onSubmit,
                isEnabled: shouldEnterPassword,
                isFormValid: Object.keys(errors).length === 0,
            }}
        >
            {shouldEnterPassword ? (
                <div className="p-6 space-y-8">
                    {/* Header */}
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl mx-auto flex items-center justify-center shadow-lg">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                                Backup Required
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                Enter your password to back up your seed phrase and secure your wallet.
                            </p>
                        </div>
                    </div>

                    {/* Warning */}
                    <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-4">
                        <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                                <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-red-900 dark:text-red-100 mb-1">
                                    Security Warning
                                </h3>
                                <p className="text-xs text-red-800 dark:text-red-200 leading-relaxed">
                                    Without a backup, you could lose access to your wallet and funds permanently.
                                    This is your only chance to secure your wallet.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Password Input */}
                    <div className="bg-gray-50 dark:bg-gray-800/30 rounded-xl p-4">
                        <PasswordInput
                            label="Password"
                            placeholder="Enter Password"
                            {...register("password")}
                            error={errors.password?.message}
                            autoFocus
                        />
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col w-full h-0 max-h-screen p-6">
                    {/* Header */}
                    <div className="text-center space-y-4 mb-6">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl mx-auto flex items-center justify-center shadow-lg">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                                Your Seed Phrase
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                Save this phrase in a secure location to recover your wallet
                            </p>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-6">
                        {/* Important info */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4">
                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0">
                                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-1">
                                        Why This Matters
                                    </h3>
                                    <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                                        Your seed phrase is the key to your wallet. It makes it possible to restore your wallet after losing access.
                                        Import your seed phrase to gain access to the funds held on your BlockWallet.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Security warning */}
                        <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-4">
                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0">
                                    <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-red-900 dark:text-red-100 mb-1">
                                        Security Warning
                                    </h3>
                                    <p className="text-xs text-red-800 dark:text-red-200 leading-relaxed">
                                        Never disclose your seed phrase. Anyone asking for your seed phrase is most likely trying to steal your funds.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Seed phrase reveal */}
                        <div className="bg-gray-50 dark:bg-gray-800/30 rounded-xl p-4">
                            <ClickToReveal
                                hiddenText={seedPhrase}
                                revealMessage={"Click here to reveal secret words"}
                                revealed={revealed}
                                onClick={() => setRevealed(true)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </PopupLayout>
    )
}

export default ReminderPage
