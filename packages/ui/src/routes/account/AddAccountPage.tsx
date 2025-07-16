import { useEffect } from "react"
import WaitingDialog, {
    useWaitingDialog,
} from "../../components/dialog/WaitingDialog"
import * as yup from "yup"
import { yupResolver } from "@hookform/resolvers/yup"
import { useForm } from "react-hook-form"
import {
    createAccount as createAccountAction,
    selectAccount,
} from "../../context/commActions"
import useAsyncInvoke from "../../util/hooks/useAsyncInvoke"
import PopupLayout from "../../components/popup/PopupLayout"
import { useHistory } from "react-router-dom"
import TextInput from "../../components/input/TextInput"
import PopupFooter from "../../components/popup/PopupFooter"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import PopupHeader from "../../components/popup/PopupHeader"
import useNewAccountHelper from "./useNewAccountHelper"
import Icon, { IconName } from "../../components/ui/Icon"

// Schema
const createAccountSchema = yup.object({
    accountName: yup.string().max(40, "Account name is too long"),
})
type createAccountFormData = { accountName: string }

const AddAccountPage = () => {
    const history = useHistory()
    const { run, isLoading, isSuccess, isError, reset } = useAsyncInvoke()
    const { isOpen, status, dispatch } = useWaitingDialog()
    const { suggestedAccountName, checkAccountNameAvailablility } =
        useNewAccountHelper()
    const {
        register,
        handleSubmit,
        setError,
        watch,
        formState: { errors },
    } = useForm<createAccountFormData>({
        resolver: yupResolver(createAccountSchema),
    })

    const accountNameValue = watch("accountName")

    const onSubmit = handleSubmit(async (data: createAccountFormData) => {
        if (!data.accountName || !data.accountName.trim()) {
            data.accountName = suggestedAccountName
        }

        data.accountName = data.accountName.trim()

        try {
            const { isAvailable, error: accountNameErr } =
                checkAccountNameAvailablility(data.accountName)

            if (!isAvailable) {
                throw new Error(accountNameErr)
            }

            //run always receives a promise
            await run(
                new Promise(async (resolve, reject) => {
                    try {
                        const newAccount = await createAccountAction(
                            data.accountName!
                        )
                        await selectAccount(newAccount.address)
                        resolve(true)
                    } catch (e) {
                        reject(e)
                    }
                })
            )
        } catch (error: any) {
            setError(
                "accountName",
                {
                    message: error.message ?? "Error creating the account",
                },
                {
                    shouldFocus: true,
                }
            )
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

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="New Account"
                    onBack={() => history.goBack()}
                />
            }
        >
            <WaitingDialog
                status={status}
                open={isOpen}
                titles={{
                    loading: "Creating Account...",
                    error: "Error",
                    success: "Success!",
                }}
                texts={{
                    loading: `Please wait while your account is being created...`,
                    error: "There was an error while creating the account",
                    success: `Congratulations! Your account has been created!`,
                }}
                onDone={() => {
                    if (isError) {
                        dispatch({ type: "close" })
                        reset()
                        return
                    }
                    history.push("/")
                }}
                timeout={1100}
            />

            {/* Background with gradient - ensure full coverage */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900/10"></div>
            <div className="relative z-10 min-h-full">
                <div className="flex flex-col flex-1 w-full h-full">
                    <form
                        className="flex flex-col justify-between flex-1 h-full"
                        onSubmit={onSubmit}
                        id="create-account-form"
                        aria-label="New Account"
                    >
                        {/* Main content area */}
                        <div className="flex-1 p-6">
                            {/* Header section */}
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 flex items-center justify-center shadow-lg">
                                    <Icon name={IconName.WALLET} size="xl" className="text-white" />
                                </div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                    Create New Account
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-sm mx-auto">
                                    This account will be derived from your existing seed phrase and protected by the same security.
                                </p>
                            </div>

                            {/* Form section with enhanced styling */}
                            <div className="space-y-6">
                                <div className="relative">
                                    <TextInput
                                        appearance="outline"
                                        label="Account Name"
                                        {...register("accountName")}
                                        placeholder={suggestedAccountName}
                                        error={errors.accountName?.message}
                                        autoFocus={true}
                                        maxLength={40}
                                        className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400"
                                    />
                                    {/* Character counter */}
                                    <div className="mt-2 flex justify-between items-center text-xs">
                                        <span className="text-gray-500 dark:text-gray-400">
                                            {accountNameValue?.length || 0}/40 characters
                                        </span>
                                        {!errors.accountName && accountNameValue && (
                                            <span className="text-green-600 dark:text-green-400 flex items-center">
                                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Valid name
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Preview section */}
                                <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/30">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                            <Icon name={IconName.EYE} size="sm" className="text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                                                Account Preview
                                            </h4>
                                            <p className="text-xs text-blue-700 dark:text-blue-300">
                                                Name: {accountNameValue || suggestedAccountName}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Info section */}
                                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50">
                                    <div className="flex items-start space-x-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                                                Security Note
                                            </h4>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                                This account will share the same recovery phrase as your other accounts. You can rename it later in account settings.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer with enhanced button */}
                        <div className="border-t border-gray-200 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                            <PopupFooter>
                                <ButtonWithLoading
                                    type="submit"
                                    isLoading={isLoading}
                                    disabled={isLoading}
                                    label="Create Account"
                                    buttonClass="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none disabled:shadow-md"
                                />
                            </PopupFooter>
                        </div>
                    </form>
                </div>
            </div>
        </PopupLayout>
    )
}

export default AddAccountPage
