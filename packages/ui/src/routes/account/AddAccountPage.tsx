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

        formState: { errors },
    } = useForm<createAccountFormData>({
        resolver: yupResolver(createAccountSchema),
    })

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
        <PopupLayout header={<PopupHeader title="New Account" />}>
            <WaitingDialog
                status={status}
                open={isOpen}
                titles={{
                    loading: "Fetching balances...",
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
            <div className="flex flex-col flex-1 w-full">
                <form
                    className="flex flex-col justify-between flex-1 h-full"
                    onSubmit={onSubmit}
                    id="create-account-form"
                    aria-label="New Account"
                >
                    <div className="flex flex-col flex-1 p-6 space-y-1">
                        <TextInput
                            appearance="outline"
                            label="Account Name"
                            {...register("accountName")}
                            placeholder={suggestedAccountName}
                            error={errors.accountName?.message}
                            autoFocus={true}
                            maxLength={40}
                        />
                    </div>
                    <hr className="border-0.5 border-primary-grey-hover w-full" />
                    <PopupFooter>
                        <ButtonWithLoading
                            type="submit"
                            isLoading={isLoading}
                            disabled={isLoading}
                            label="Create"
                        ></ButtonWithLoading>
                    </PopupFooter>
                </form>
            </div>
        </PopupLayout>
    )
}

export default AddAccountPage
