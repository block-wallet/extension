import { useState } from "react"

import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import PasswordInput from "../../components/input/PasswordInput"
import AntiPhishing from "../../components/phishing/AntiPhishing"

import PopupFooter from "../../components/popup/PopupFooter"
import WarningTip from "../../components/label/WarningTip"
import * as yup from "yup"
import { InferType } from "yup"
import { useForm } from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import { useBlankState } from "../../context/background/backgroundHooks"
import {
    verifyPassword,
    exportAccountPrivateKey,
    exportAccountJson,
    requestSeedPhrase,
} from "../../context/commActions"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import Select from "../../components/input/Select"
import { useSelectedAccount } from "../../context/hooks/useSelectedAccount"
import { HARDWARE_TYPES, isInternalAccount } from "../../util/account"
import Tooltip from "../../components/label/Tooltip"

const schema = yup.object({
    password: yup.string().required("No password provided."),
    exportType: yup
        .string()
        .default("key")
        .required("Please select an export format"),
    encryptingPassword: yup.string().when("exportType", {
        is: (value: any) => value === "json",
        then: (rule) => rule.required("Please enter an encrypting password"),
    }),
    encryptingPasswordConfirmation: yup
        .string()
        .nullable()
        .notRequired()
        .when("encryptingPassword", {
            is: (value: any) => !!value,
            then: (rule: any) =>
                rule
                    .required("Please confirm the encrypting password")
                    .oneOf(
                        [yup.ref("encryptingPassword"), null],
                        "Encrypting passwords must match."
                    ),
        }),
})

type ExportAccountFormData = InferType<typeof schema>

const ExportAccountPage = () => {
    const history = useOnMountHistory()
    const fromAccountList = history.location.state?.fromAccountList

    const account = useSelectedAccount()
    const blankState = useBlankState()!
    const [isVerificationInProgress, setIsVerificationInProgress] =
        useState<boolean>(false)
    const {
        register,
        handleSubmit,
        setError,
        watch,
        setValue,

        formState: { errors },
    } = useForm<ExportAccountFormData>({
        defaultValues: {
            exportType: "key",
        },
        resolver: yupResolver(schema),
        shouldUnregister: false,
    })

    const exportType = watch("exportType")
    const onSubmit = handleSubmit(async (data: ExportAccountFormData) => {
        setIsVerificationInProgress(true)
        try {
            if (HARDWARE_TYPES.includes(account.accountType)) {
                throw new Error(
                    "Can't export data from a Hardware Wallet account"
                )
            }
            const isValidPassword = await verifyPassword(data.password)
            if (!isValidPassword) {
                throw new Error("Incorrect password")
            }

            let exportData = ""

            switch (data.exportType) {
                case "key":
                    exportData = await exportAccountPrivateKey(
                        account.address,
                        data.password
                    )
                    break
                case "json":
                    exportData = await exportAccountJson(
                        account.address,
                        data.password,
                        data.encryptingPassword!
                    )
                    break
                case "seedphrase":
                    exportData = await requestSeedPhrase(data.password)
                    break
            }

            setIsVerificationInProgress(false)
            history.push({
                pathname: "/accounts/menu/export/done",
                state: { exportData, exportType: data.exportType },
            })
        } catch (e) {
            setError(
                "password",
                {
                    message: e.message,
                },
                {
                    shouldFocus: true,
                }
            )
            setIsVerificationInProgress(false)

            return Promise.reject()
        }
    })

    return (
        <form className="w-full h-full">
            <div className="flex flex-col w-full h-full" id="export-key-form">
                <PopupLayout
                    submitOnEnter={{
                        onSubmit,
                        isFormValid: Object.keys(errors).length === 0,
                    }}
                    header={
                        <PopupHeader
                            title="Export Account Data"
                            onBack={() => {
                                history.push({
                                    pathname: "/accounts/menu",
                                    state: { fromAccountList },
                                })
                            }}
                        />
                    }
                    footer={
                        <PopupFooter>
                            <ButtonWithLoading
                                label="Export"
                                type="submit"
                                isLoading={isVerificationInProgress}
                                onClick={onSubmit}
                                disabled={HARDWARE_TYPES.includes(
                                    account.accountType
                                )}
                            />
                        </PopupFooter>
                    }
                >
                    <div className="flex flex-col p-6 space-y-4">
                        <div className="flex flex-col space-y-1">
                            <PasswordInput
                                label="Your Password"
                                placeholder="Your Password"
                                {...register("password")}
                                error={errors.password?.message}
                                autoFocus={true}
                            />
                        </div>
                        <div className="flex flex-col space-y-1 mb-5">
                            <Select
                                onChange={(value: string) => {
                                    setValue("exportType", value)
                                }}
                                currentValue={exportType}
                                label="Format"
                                id="exportType"
                                error={errors.exportType?.message}
                            >
                                <Select.Option value="key">
                                    Private Key
                                </Select.Option>
                                <Select.Option value="json">
                                    JSON Data
                                </Select.Option>
                                <Select.Option
                                    value="seedphrase"
                                    disabled={
                                        !isInternalAccount(account.accountType)
                                    }
                                >
                                    <div className="group relative">
                                        <div>Seed Phrase</div>
                                        {!isInternalAccount(
                                            account.accountType
                                        ) && (
                                            <Tooltip
                                                className="!w-60 !break-word !whitespace-normal !-translate-y-8 !translate-x-3 border boder-gray-300"
                                                content={
                                                    <span>
                                                        Seed Phrase can only be
                                                        exported while using an
                                                        internal account.
                                                    </span>
                                                }
                                            />
                                        )}
                                    </div>
                                </Select.Option>
                            </Select>
                        </div>
                        <div className="flex flex-col space-y-1">
                            {exportType === "json" && (
                                <>
                                    <div className="mb-5">
                                        <PasswordInput
                                            label="Encrypting Password"
                                            placeholder="Encrypting Password"
                                            {...register("encryptingPassword")}
                                            error={
                                                errors.encryptingPassword
                                                    ?.message
                                            }
                                            autoFocus={false}
                                            name="encryptingPassword"
                                        />
                                    </div>
                                    <PasswordInput
                                        label="Confirm Encrypting Password"
                                        placeholder="Confirm Encrypting Password"
                                        {...register(
                                            "encryptingPasswordConfirmation"
                                        )}
                                        error={
                                            errors
                                                .encryptingPasswordConfirmation
                                                ?.message
                                        }
                                        autoFocus={false}
                                        name="encryptingPasswordConfirmation"
                                    />
                                </>
                            )}
                        </div>
                        {exportType === "json" && (
                            <WarningTip
                                text={
                                    "Encrypting password is used to encrypt your export. You will need it when importing the account data later. Please create a strong encrypting password and store it securely."
                                }
                                fontSize="text-xs"
                                justify="justify-start"
                            />
                        )}
                        {blankState.settings.useAntiPhishingProtection && (
                            <div className="pt-1">
                                <AntiPhishing
                                    image={blankState.antiPhishingImage}
                                />
                            </div>
                        )}
                    </div>
                </PopupLayout>
            </div>
        </form>
    )
}

export default ExportAccountPage
