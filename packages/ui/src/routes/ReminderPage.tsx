import { useState } from "react"
import { useHistory } from "react-router-dom"
import * as yup from "yup"
import { yupResolver } from "@hookform/resolvers/yup"
import { useForm } from "react-hook-form"

import PopupHeader from "../components/popup/PopupHeader"
import PopupLayout from "../components/popup/PopupLayout"
import PopupFooter from "../components/popup/PopupFooter"
import ClickToReveal from "../components/label/ClickToReveal"
import { ButtonWithLoading } from "../components/button/ButtonWithLoading"
import PasswordInput from "../components/input/PasswordInput"

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
    const [seedPhrase, setSeedPhrase] = useState<string | undefined>(
        () => history.location?.state?.seedPhrase
    )
    const [password, setPassword] = useState<string | undefined>(
        () => history.location?.state?.password
    )

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
                <div className="flex-1 flex flex-col justify-between p-4">
                    <div className="text-center space-y-2">
                        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                            Backup required
                        </h2>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                            Enter your password to continue.
                        </p>
                    </div>
                    <PasswordInput
                        label="Password"
                        placeholder="Enter Password"
                        {...register("password")}
                        error={errors.password?.message}
                        autoFocus
                    />
                </div>
            ) : (
                <div className="flex-1 flex flex-col justify-between p-4">
                    <div className="text-center space-y-2">
                        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                            Your seed phrase
                        </h2>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                            Save this phrase in a secure location.
                        </p>
                    </div>
                    <div className="my-3">
                        <ClickToReveal
                            hiddenText={seedPhrase}
                            revealMessage={"Click here to reveal secret words"}
                            revealed={revealed}
                            onClick={() => setRevealed(true)}
                            compact
                        />
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 text-center">
                        Never share your seed phrase with anyone.
                    </p>
                </div>
            )}
        </PopupLayout>
    )
}

export default ReminderPage
