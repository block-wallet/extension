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
                    title="You Haven’t Set Up a Backup"
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
                <div className="p-6 flex flex-col space-y-8">
                    <div className="flex flex-col space-y-2">
                        <span className="text-center text-base font-bold">
                            Enter your password to back up your seed phrase.
                        </span>
                    </div>
                    <div className="flex flex-col space-y-2">
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
                <div className="flex-1 flex flex-col items-center justify-center w-full h-0 max-h-screen p-6">
                    <div className="flex flex-col space-y-8 p-2 text-primary-grey-dark text-sm">
                        <span>
                            Your seed phrase is the key to your wallet. It makes
                            it possible to restore your wallet after losing
                            access. Import your seed phrase to gain access to
                            the funds held on your BlockWallet. Backup your seed
                            phrase and store it in a safe place.
                        </span>
                        <span>
                            <b className="text-gray-900">Warning:</b> Never
                            disclose your seed phrase. Anyone asking for your
                            seed phrase is most likely trying to steal your
                            funds.
                        </span>
                        <ClickToReveal
                            hiddenText={seedPhrase}
                            revealMessage={"Click here to reveal secret words"}
                            revealed={revealed}
                            onClick={() => setRevealed(true)}
                        />
                    </div>
                </div>
            )}
        </PopupLayout>
    )
}

export default ReminderPage
