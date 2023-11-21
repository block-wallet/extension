import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import * as yup from "yup"
import { yupResolver } from "@hookform/resolvers/yup"
import { useForm } from "react-hook-form"
import { useBlankState } from "../../context/background/backgroundHooks"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { useSelectedAccount } from "../../context/hooks/useSelectedAccount"
import TextInput from "../../components/input/TextInput"
import PopupFooter from "../../components/popup/PopupFooter"
import { renameAccount } from "../../context/commActions"
import WaitingDialog, {
    useWaitingDialog,
} from "../../components/dialog/WaitingDialog"
import { accountNameExists } from "../../util/account"

// Schema
const editAccountSchema = yup.object().shape({
    accountName: yup
        .string()
        .trim()
        .required("Please enter an account name")
        .max(40, "Account name is too long"),
})
type editAccountFormData = { accountName: string }
const EditAccountPage = () => {
    const { accounts, hiddenAccounts } = useBlankState()!
    const account = useSelectedAccount()
    const history = useOnMountHistory()

    const fromAccountList = history.location.state?.fromAccountList

    const { status, isOpen, dispatch } = useWaitingDialog()

    const {
        register,
        handleSubmit,
        setError,

        formState: { errors },
    } = useForm<editAccountFormData>({
        resolver: yupResolver(editAccountSchema),
    })

    const onSubmit = handleSubmit(async (data: editAccountFormData) => {
        try {
            if (accountNameExists(accounts, data.accountName || "")) {
                setError(
                    "accountName",
                    {
                        message:
                            "Account name is already in use, please use a different one.",
                    },
                    {
                        shouldFocus: true,
                    }
                )
                return Promise.reject()
            }

            if (accountNameExists(hiddenAccounts, data.accountName || "")) {
                setError(
                    "accountName",
                    {
                        message:
                            "Account name is already in use on a hidden account, please use a different one.",
                    },
                    {
                        shouldFocus: true,
                    }
                )
                return Promise.reject()
            }

            dispatch({
                type: "open",
                payload: { status: "loading" },
            })

            await renameAccount(account.address, data.accountName)

            dispatch({ type: "setStatus", payload: { status: "success" } })
        } catch {
            setError(
                "accountName",
                {
                    message: "Error renaming the account",
                },
                {
                    shouldFocus: true,
                }
            )

            dispatch({ type: "setStatus", payload: { status: "error" } })

            return Promise.reject()
        }
    })

    return (
        <PopupLayout
            submitOnEnter={{
                onSubmit,
                isFormValid: Object.keys(errors).length === 0,
            }}
            header={
                <PopupHeader
                    title="Edit Account"
                    disabled={isOpen}
                    onBack={() =>
                        history.push({
                            pathname: "/accounts/menu",
                            state: {
                                fromAccountList,
                            },
                        })
                    }
                />
            }
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        type="button"
                        isLoading={isOpen && status === "loading"}
                        label={"Save"}
                        onClick={onSubmit}
                    />
                </PopupFooter>
            }
        >
            <WaitingDialog
                status={status}
                open={isOpen}
                titles={{
                    loading: "Renaming...",
                    success: "Congratulations",
                    error: "Error",
                }}
                timeout={1500}
                texts={{
                    loading: "Account is being renamed...",
                    success: "Your changes have been succesfully saved!",
                    error: errors.accountName?.message ?? "",
                }}
                onDone={() => {
                    if (status === "error") {
                        dispatch({ type: "close" })
                        return
                    }

                    history.push({
                        pathname: "/accounts/menu",
                        state: { fromAccountList },
                    })
                }}
                showCloseButton
            />
            <div className="flex flex-col justify-between flex-1 h-full">
                <div className="flex flex-col flex-1 p-6 space-y-1">
                    <TextInput
                        appearance="outline"
                        label="Account Name"
                        {...register("accountName")}
                        placeholder={account.name}
                        error={errors.accountName?.message}
                        autoFocus={true}
                        maxLength={40}
                        defaultValue={account.name}
                    />
                </div>
            </div>
        </PopupLayout>
    )
}

export default EditAccountPage
