import { useEffect, useState } from "react"
import { yupResolver } from "@hookform/resolvers/yup"
import { useForm } from "react-hook-form"
import WaitingDialog, {
    useWaitingDialog,
} from "../../components/dialog/WaitingDialog"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import { useBlankState } from "../../context/background/backgroundHooks"
import useAsyncInvoke from "../../util/hooks/useAsyncInvoke"
import * as yup from "yup"
import { useHistory } from "react-router-dom"
import useNewAccountHelper from "./useNewAccountHelper"
import {
    importAccountPrivateKey,
    selectAccount,
} from "../../context/commActions"
import TextInput from "../../components/input/TextInput"
import Select from "../../components/input/Select"
import AntiPhishing from "../../components/phishing/AntiPhishing"
import PopupFooter from "../../components/popup/PopupFooter"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import Alert from "../../components/ui/Alert"

const importAccountSchema = yup.object({
    privateKey: yup
        .string()
        .required("Please enter a private key")
        .matches(/^(0x)?[0-9a-fA-F]{64}$/, "Please enter a valid private key"),
    importType: yup.string().required("Please select a type of import"),
    accountName: yup.string().max(40, "Account name is too long"),
})
type importAccountFormData = {
    privateKey: string
    importType: string
    accountName: string
}

const ImportAccountPage = () => {
    const { run, isError, isSuccess, isLoading, reset } = useAsyncInvoke()
    const { isOpen, status, dispatch } = useWaitingDialog()
    const history = useHistory()
    const state = useBlankState()!
    const { suggestedAccountName, checkAccountNameAvailablility } =
        useNewAccountHelper()
    const [discoveryError, setDiscoveryError] = useState<string>("")
    const [retryAttempts, setRetryAttempts] = useState<number>(0)

    const {
        register,
        handleSubmit,
        setError,
        setValue,
        watch,

        formState: { errors },
    } = useForm<importAccountFormData>({
        defaultValues: {
            importType: "key",
        },
        shouldUnregister: false,
        resolver: yupResolver(importAccountSchema),
    })
    const importType = watch("importType")

    const onSubmit = handleSubmit(async (data: importAccountFormData) => {
        if (!data.accountName || !data.accountName.trim()) {
            data.accountName = suggestedAccountName
        }

        data.accountName = data.accountName.trim()

        try {
            const { isAvailable, error: accountNameErr } =
                checkAccountNameAvailablility(data.accountName || "")

            if (!isAvailable) {
                setError(
                    "accountName",
                    {
                        message: accountNameErr,
                    },
                    {
                        shouldFocus: true,
                    }
                )
                return
            }

            // Reset any previous discovery errors
            setDiscoveryError("")

            //run always receives a promise
            await run(
                new Promise(async (resolve, reject) => {
                    try {
                        const newAccount = await importAccountPrivateKey(
                            { privateKey: data.privateKey },
                            data.accountName!
                        )
                        await selectAccount(newAccount.address)
                        resolve(true)
                    } catch (e: any) {
                        // Check if this is a port disconnection error
                        if (e.message && e.message.toLowerCase().includes("attempting to use a disconnected port object")) {
                            // Set a more user-friendly error message
                            setDiscoveryError("Communication with the extension was interrupted. Please try again.")
                            reject(e)
                        } else {
                            reject(e)
                        }
                    }
                })
            )
        } catch (e: any) {
            if (
                e.message ===
                "The account you're are trying to import is a duplicate"
            ) {
                setError(
                    "privateKey",
                    {
                        message: "Account already exists",
                    },
                    {
                        shouldFocus: true,
                    }
                )
            } else {
                setError(
                    "privateKey",
                    {
                        message: "Error importing the account",
                    },
                    {
                        shouldFocus: true,
                    }
                )
            }
        }
    })

    useEffect(() => {
        if (isError) {
            dispatch({
                type: "setStatus",
                payload: {
                    status: "error",
                },
            })
            return
        }
        if (isSuccess) {
            dispatch({
                type: "setStatus",
                payload: { status: "success" },
            })
            return
        }
        if (isLoading) {
            dispatch({
                type: "open",
                payload: { status: "loading" },
            })
            return
        }
    }, [isLoading, isSuccess, isError, dispatch])

    // Function to retry the import when there's a port connection error
    const handleRetry = () => {
        setRetryAttempts(prev => prev + 1)
        setDiscoveryError("")
        // Wait for 500ms to ensure connection is reestablished
        setTimeout(() => {
            // Get current form values and resubmit manually
            const currentValues = watch();
            onSubmit(currentValues as any);
        }, 500)
    }

    return (
        <PopupLayout header={<PopupHeader title="Import External Account" />}>
            <WaitingDialog
                status={status}
                open={isOpen}
                titles={{
                    loading: "Fetching balances...",
                    error: "Error",
                    success: "Success!",
                }}
                texts={{
                    loading: `Please wait while your account is being imported...`,
                    error: "There was an error while importing the account",
                    success: `Congratulations! Your account has been imported!`,
                }}
                onDone={() => {
                    if (isError) {
                        dispatch({ type: "close" })
                        reset()
                        return
                    }

                    history.replace("/")
                }}
                timeout={1100}
            />
            <div className="flex flex-col flex-1 w-full">
                {discoveryError && (
                    <div className="px-6 pt-6">
                        <Alert type="error" className="mb-4">
                            <div className="flex flex-col">
                                <span><strong>Discovery Error:</strong> {discoveryError}</span>
                                {retryAttempts < 3 && (
                                    <button
                                        onClick={handleRetry}
                                        className="text-red-700 dark:text-red-400 underline font-medium mt-2 self-end hover:text-red-800 dark:hover:text-red-300 transition-colors duration-200"
                                    >
                                        Retry
                                    </button>
                                )}
                            </div>
                        </Alert>
                    </div>
                )}

                {/* Background with gradient - ensure full coverage */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900/10"></div>
                <div className="relative z-10 min-h-full flex-1">
                    <form
                        className="flex flex-col justify-between flex-1 h-full"
                        onSubmit={onSubmit}
                    >
                        {/* Main content area */}
                        <div className="flex-1 p-6">
                            {/* Header section */}
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-400 dark:to-purple-500 flex items-center justify-center shadow-lg">
                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                    </svg>
                                </div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                    Import External Account
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-sm mx-auto">
                                    Import an existing account using its private key from another wallet or source.
                                </p>
                            </div>

                            {/* Form fields with enhanced styling */}
                            <div className="space-y-6">
                                {/* Account Name Field */}
                                <div className="space-y-2">
                                    <TextInput
                                        appearance="outline"
                                        label="Account Name"
                                        {...register("accountName")}
                                        placeholder={suggestedAccountName}
                                        error={errors.accountName?.message}
                                        autoFocus={true}
                                        maxLength={40}
                                        className="transition-all duration-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:focus:border-purple-400"
                                    />
                                </div>

                                {/* Import Type Selector */}
                                <div className="space-y-2">
                                    <Select
                                        onChange={(value) => {
                                            setValue("importType", value)
                                        }}
                                        currentValue={importType}
                                        label="Import Method"
                                        id="type"
                                        error={errors.importType?.message}
                                    >
                                        <Select.Option value="key">
                                            Private Key
                                        </Select.Option>
                                    </Select>
                                </div>

                                {/* Private Key Field */}
                                <div className="space-y-2">
                                    <TextInput
                                        appearance="outline"
                                        label="Private Key"
                                        placeholder="Enter your 64-character private key (with or without 0x prefix)"
                                        {...register("privateKey")}
                                        error={errors.privateKey?.message}
                                        maxLength={66}
                                        className="font-mono text-xs transition-all duration-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 dark:focus:border-purple-400"
                                    />
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-500 dark:text-gray-400">
                                            64 hexadecimal characters (0-9, a-f)
                                        </span>
                                    </div>
                                </div>

                                {/* Security Warning */}
                                <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30">
                                    <div className="flex items-start space-x-3">
                                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                                            <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">
                                                Security Notice
                                            </h4>
                                            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                                                Never share your private key with anyone. BlockWallet securely stores it locally and will never transmit it anywhere.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Anti-phishing protection */}
                                {state.settings.useAntiPhishingProtection && (
                                    <div className="pt-2">
                                        <AntiPhishing
                                            image={state.antiPhishingImage}
                                            size="sm"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer with enhanced button */}
                        <div className="border-t border-gray-200 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                            <PopupFooter>
                                <ButtonWithLoading
                                    type="submit"
                                    isLoading={isLoading}
                                    disabled={isLoading}
                                    label="Import Account"
                                    buttonClass="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 dark:from-purple-500 dark:to-purple-600 dark:hover:from-purple-600 dark:hover:to-purple-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none disabled:shadow-md"
                                />
                            </PopupFooter>
                        </div>
                    </form>
                </div>
            </div>
        </PopupLayout>
    )
}

export default ImportAccountPage
