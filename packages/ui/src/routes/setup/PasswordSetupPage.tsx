import { useEffect, useState } from "react"

import { Classes } from "../../styles/classes"

import PageLayout from "../../components/PageLayout"
import Divider from "../../components/Divider"
import LinkButton from "../../components/button/LinkButton"
import PasswordInput from "../../components/input/PasswordInput"

import { useForm } from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import * as yup from "yup"

import { createWallet, requestSeedPhrase } from "../../context/commActions"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import log from "loglevel"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import { useCheckUserIsOnboarded } from "../../context/hooks/useCheckUserIsOnboarded"

// Define step labels for the create wallet flow
export const CREATE_WALLET_STEP_LABELS = [
    "Create Password",
    "Backup Secret Phrase",
    "Verify Secret Phrase",
    "Setup Complete"
]

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

type PasswordSetupFormData = {
    password: string
    passwordConfirmation: string
    acceptTOU: boolean
}

const PasswordSetupPage = () => {
    const history = useOnMountHistory()
    const [passwordScore, setPasswordScore] = useState<number>(0)
    const [isCreating, setIsCreating] = useState<boolean>(false)
    const [isSubmitDisabled, setIsSubmitDisabled] = useState(true)
    // if the onboarding is ready the user shoulnd't set the password again.
    useCheckUserIsOnboarded()

    const { register, handleSubmit, setError, watch, formState, trigger } =
        useForm<PasswordSetupFormData>({
            mode: "onChange",
            resolver: yupResolver(schema),
        })

    const onSubmit = handleSubmit(async (data: PasswordSetupFormData) => {
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

        setIsCreating(true)

        createWallet(data.password)
            .then(() => {
                requestSeedPhrase(data.password)
                    .then((seedPhrase) => {
                        setIsCreating(false)
                        history.push({
                            pathname: "/setup/create/notice",
                            state: { seedPhrase, password: data.password },
                        })
                    })
                    .catch((err) => {
                        log.error(err)
                        setIsCreating(false)
                    })
            })
            .catch((err) => {
                log.error(err)
                setIsCreating(false)
            })
    })

    const passwordValues = watch()
    useEffect(() => {
        if (formState.isValid) {
            setIsSubmitDisabled(false)
        } else {
            setIsSubmitDisabled(true)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [passwordValues, formState.errors.password])

    useEffect(() => {
        // trigger password confirmation validation when password changes given that there is a value in both fields
        if (passwordValues.password && passwordValues.passwordConfirmation) {
            trigger("passwordConfirmation")
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [passwordValues.password, trigger])

    return (
        <PageLayout
            header
            className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900/30 min-h-screen"
            withSteps={true}
            currentStep={1}
            totalSteps={4}
            stepLabels={CREATE_WALLET_STEP_LABELS}
        >
            <div className="relative z-10 w-full max-w-lg mx-auto px-4 py-8">
                {/* Page header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 dark:from-gray-100 dark:via-blue-100 dark:to-indigo-100 bg-clip-text text-transparent mb-2">
                        Create a Password
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                        Choose a strong password to secure your wallet
                    </p>
                </div>

                <Divider />

                {/* Main content card */}
                <div className="mt-8">
                    <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl dark:shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-indigo-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-indigo-900/20 p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="text-center space-y-3">
                                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl mx-auto flex items-center justify-center shadow-lg">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                        Secure Your Wallet
                                    </h2>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        This password will be used to unlock your wallet
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Form section */}
                        <form onSubmit={onSubmit}>
                            <div className="p-6 space-y-6">
                                {/* Password fields */}
                                <div className="space-y-4">
                                    <PasswordInput
                                        label="New Password"
                                        placeholder="Enter New Password"
                                        {...register("password")}
                                        error={formState.errors.password?.message}
                                        autoFocus={true}
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

                                {/* Security tips */}
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4">
                                    <div className="flex items-start space-x-3">
                                        <div className="flex-shrink-0">
                                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-1">
                                                Password Tips
                                            </h3>
                                            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                                                <li>• Use at least 8 characters</li>
                                                <li>• Include lowercase letters and numbers</li>
                                                <li>• Make it unique and memorable</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                {/* Terms of Use */}
                                <div className="bg-gray-50 dark:bg-gray-800/30 rounded-xl p-4">
                                    <div className="flex items-start space-x-3">
                                        <div className="flex-shrink-0 mt-0.5">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                id="acceptTOU"
                                                {...register("acceptTOU")}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label htmlFor="acceptTOU" className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed cursor-pointer">
                                                I have read and agree to the{" "}
                                                <a
                                                    href="https://blockwallet.io/terms-of-use-of-block-wallet.html"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline transition-colors duration-200"
                                                >
                                                    Terms of Use
                                                </a>
                                            </label>
                                            {formState.errors.acceptTOU?.message && (
                                                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                                    {formState.errors.acceptTOU.message}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer with actions */}
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-6 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex flex-row justify-between space-x-4">
                                    <LinkButton
                                        location="/setup/"
                                        text="Back"
                                        lite
                                        disabled={isCreating}
                                        classes="flex items-center px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                    />

                                    <ButtonWithLoading
                                        label="Create Wallet"
                                        isLoading={isCreating}
                                        onClick={onSubmit}
                                        buttonClass="flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg min-w-[140px]"
                                        disabled={isCreating || isSubmitDisabled}
                                    />
                                </div>
                            </div>
                        </form>
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
    )
}

export default PasswordSetupPage
