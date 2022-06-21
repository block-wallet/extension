import React, { useRef } from "react"

import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import PopupFooter from "../../components/popup/PopupFooter"
import TextInput from "../../components/input/TextInput"
import WaitingDialog, {
    useWaitingDialog,
} from "../../components/dialog/WaitingDialog"

import * as yup from "yup"
import { InferType } from "yup"
import { yupResolver } from "@hookform/resolvers/yup"
import { useForm } from "react-hook-form"

import { createAccount } from "../../context/commActions"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import useNewAccountHelper from "../account/useNewAccountHelper"

const createAccountSchema = yup.object().shape({
    accountName: yup.string().max(40, "Account name is too long"),
})
type createAccountFormData = InferType<typeof createAccountSchema>

const WithdrawBlankCreateAccount = () => {
    const history: any = useOnMountHistory()
    const {
        pair,
        preSelectedAsset,
        isAssetDetailsPage,
    } = history.location.state
    const {
        register,
        handleSubmit,
        errors,
        setError,
    } = useForm<createAccountFormData>({
        resolver: yupResolver(createAccountSchema),
    })
    const {
        suggestedAccountName,
        checkAccountNameAvailablility,
    } = useNewAccountHelper()
    const { isOpen, status, dispatch } = useWaitingDialog()
    const createdAccountAddressRef = useRef("")

    const onSubmit = handleSubmit(async (data: createAccountFormData) => {
        try {
            let accountName = data.accountName ?? suggestedAccountName
            const { isAvailable, error } = checkAccountNameAvailablility(
                accountName
            )

            if (!isAvailable) {
                throw new Error(error)
            }

            dispatch({ type: "open", payload: { status: "loading" } })

            const newAccount = await createAccount(accountName)

            createdAccountAddressRef.current = newAccount.address

            dispatch({ type: "setStatus", payload: { status: "success" } })
        } catch (e) {
            setError("accountName", {
                message: e.message || "Error creating account.",
                shouldFocus: true,
            })
            dispatch({ type: "setStatus", payload: { status: "error" } })
        }
    })

    return (
        <>
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
                    error: "An error happened while creating the account.",
                    success: `Congratulations! Your account has been created!`,
                }}
                onDone={() => {
                    if (!!errors.accountName) {
                        dispatch({ type: "close" })
                        return
                    }

                    if (createdAccountAddressRef.current === "")
                        throw new Error("Account address is not set")

                    history.push({
                        pathname:
                            "/privacy/withdraw/block/accounts/step/confirm",
                        state: {
                            address: createdAccountAddressRef.current,
                            pair,
                            preSelectedAsset,
                            isAssetDetailsPage,
                        },
                    })
                }}
                timeout={1000}
            />
            <form className="w-full h-full" onSubmit={onSubmit}>
                <PopupLayout
                    header={
                        <PopupHeader
                            title="Withdraw From Privacy Pool"
                            onBack={() => {
                                history.push({
                                    pathname:
                                        "/privacy/withdraw/block/accounts",
                                    state: {
                                        pair,
                                        preSelectedAsset,
                                        isAssetDetailsPage,
                                    },
                                })
                            }}
                        />
                    }
                    footer={
                        <PopupFooter>
                            <ButtonWithLoading
                                type="submit"
                                label="Create"
                                isLoading={status === "loading" && isOpen}
                            />
                        </PopupFooter>
                    }
                >
                    <div className="flex flex-col p-6 space-y-1">
                        <TextInput
                            appearance="outline"
                            label="Account Name"
                            placeholder={suggestedAccountName}
                            name="accountName"
                            register={register}
                            error={errors.accountName?.message}
                        />
                    </div>
                    <div className="p-6">
                        <div className="bg-blue-300 opacity-90 rounded-md w-full p-4 flex space-x-2 items-center font-bold justify-center">
                            <span className="text-xs text-blue-900">
                                <span className="font-bold">Info: </span>
                                <span className="font-medium">
                                    For importing hardware wallet accounts,
                                    please go to the accounts management
                                    section.
                                </span>
                            </span>
                        </div>
                    </div>
                </PopupLayout>
            </form>
        </>
    )
}

export default WithdrawBlankCreateAccount
