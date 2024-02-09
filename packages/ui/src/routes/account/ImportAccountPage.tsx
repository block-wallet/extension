import { useEffect } from "react"
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

const importAccountSchema = yup.object({
    privateKey: yup
        .string()
        .required("Please enter a private key")
        .min(64, "Please enter a valid private key")
        .max(66, "Please enter a valid private key"),
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
                    } catch (e) {
                        reject(e)
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
                <form
                    className="flex flex-col justify-between flex-1 h-full"
                    onSubmit={onSubmit}
                >
                    <div className="flex flex-col flex-1 p-6 pb-3 space-y-3">
                        <div className="flex flex-col space-y-1">
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
                        <div className="flex flex-col space-y-1 mb-5">
                            <Select
                                onChange={(value) => {
                                    setValue("importType", value)
                                }}
                                currentValue={importType}
                                label="Select Type"
                                id="type"
                                error={errors.importType?.message}
                            >
                                <Select.Option value="key">
                                    Private Key
                                </Select.Option>
                            </Select>
                        </div>
                        <div className="flex flex-col space-y-1">
                            <TextInput
                                appearance="outline"
                                label="Private Key String"
                                placeholder="Paste your private key string here"
                                {...register("privateKey")}
                                error={errors.privateKey?.message}
                                maxLength={66}
                            />
                        </div>
                        {state.settings.useAntiPhishingProtection && (
                            <div className="pt-2">
                                <AntiPhishing
                                    image={state.antiPhishingImage}
                                    size="sm"
                                />
                            </div>
                        )}
                    </div>
                    <hr className="border-0.5 border-primary-grey-hover w-full" />
                    <PopupFooter>
                        <ButtonWithLoading
                            type="submit"
                            isLoading={isLoading}
                            label="Import"
                        ></ButtonWithLoading>
                    </PopupFooter>
                </form>
            </div>
        </PopupLayout>
    )
}

export default ImportAccountPage
