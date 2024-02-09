import { useState } from "react"
import { useHistory } from "react-router-dom"

import PopupFooter from "../components/popup/PopupFooter"
import PopupHeader from "../components/popup/PopupHeader"
import PopupLayout from "../components/popup/PopupLayout"
import PasswordInput from "../components/input/PasswordInput"

import ConfirmDialog from "../components/dialog/ConfirmDialog"
import ClickableText from "../components/button/ClickableText"
import AntiPhishing from "../components/phishing/AntiPhishing"

import * as yup from "yup"
import { yupResolver } from "@hookform/resolvers/yup"
import { useForm } from "react-hook-form"
import logo from "../assets/images/logo.svg"

import { unlockApp, requestSeedPhrase } from "../context/commActions"
import { openReset } from "../context/commActions"
import { useBlankState } from "../context/background/backgroundHooks"
import { ButtonWithLoading } from "../components/button/ButtonWithLoading"
import { AiFillInfoCircle } from "react-icons/ai"
import Tooltip from "../components/label/Tooltip"
import { LINKS } from "../util/constants"

const schema = yup.object().shape({
    password: yup.string().required("Password required."),
})
type PasswordFormData = { password: string }

const UnlockPage = () => {
    const {
        register,
        handleSubmit,
        formState: { errors },
        setError,
    } = useForm<PasswordFormData>({
        resolver: yupResolver(schema),
    })
    const history = useHistory()
    const {
        isSeedPhraseBackedUp,
        isUserNetworkOnline,
        settings,
        antiPhishingImage,
        lockedByTimeout,
    } = useBlankState()!
    const [hasDialog, setHasDialog] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const getSeedPhrase = async (password: any) => {
        try {
            const phrase = await requestSeedPhrase(password)
            return phrase
        } catch {
            history.replace({
                pathname: "/",
            })
        }
    }
    const onSubmit = handleSubmit(async (data: PasswordFormData) => {
        try {
            setIsLoading(true)
            if (await unlockApp(data.password)) {
                if (!isSeedPhraseBackedUp) {
                    const seedPhrase = await getSeedPhrase(data.password)

                    return history.replace({
                        pathname: "/reminder",
                        state: {
                            seedPhrase,
                            password: data.password,
                            hasBack: false,
                        },
                    })
                } else {
                    return history.replace({
                        pathname: "/",
                    })
                }
            } else {
                setError(
                    "password",
                    {
                        message: "Incorrect password",
                    },
                    { shouldFocus: true }
                )
            }
            setIsLoading(false)
        } catch (e: any) {
            setError(
                "password",
                {
                    message: "Error unlocking the extension",
                },
                {
                    shouldFocus: true,
                }
            )
        }
    })

    return (
        <PopupLayout
            header={
                <PopupHeader
                    title="Unlock BlockWallet"
                    close={false}
                    backButton={false}
                    className="w-full justify-between"
                >
                    {lockedByTimeout && (
                        <div className="group relative items-end">
                            <a
                                href={LINKS.ARTICLES.LOCK_TIMEOUT}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <AiFillInfoCircle
                                    size={26}
                                    className="pl-2 text-primary-grey-dark cursor-pointer hover:text-primary-blue-default"
                                />
                                <Tooltip
                                    className="!w-52 !break-word !whitespace-normal !-translate-x-44 !-mb-4"
                                    content="Locked too soon? Click to learn how to increase the lock timeout."
                                />
                            </a>
                        </div>
                    )}
                </PopupHeader>
            }
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        label="Confirm"
                        isLoading={isLoading}
                        onClick={onSubmit}
                    />
                </PopupFooter>
            }
            submitOnEnter={{
                onSubmit,
                isFormValid: Object.keys(errors).length === 0,
            }}
        >
            <ConfirmDialog
                title="Confirmation"
                message="Are you sure you want to reset your wallet? This action can not be undone."
                open={hasDialog}
                onClose={() => setHasDialog(false)}
                onConfirm={() => openReset()}
            />
            <div className="p-6 pb-0 flex flex-col space-y-8">
                <div className="flex flex-col space-y-2">
                    <img src={logo} alt="logo" className="w-12 h-12 mx-auto" />
                    <span className="text-center text-base font-semibold  ">
                        Enter your password to continue.
                    </span>
                </div>
                <div className="flex flex-col space-y-2">
                    <PasswordInput
                        label="Password"
                        placeholder="Enter Password"
                        {...register("password")}
                        error={errors.password?.message}
                        autoFocus={isUserNetworkOnline}
                    />
                    <div className="text-xs">
                        or&nbsp;
                        <ClickableText onClick={() => setHasDialog(true)}>
                            reset wallet using seed phrase
                        </ClickableText>
                    </div>

                    {settings.useAntiPhishingProtection && (
                        <div className="pt-3">
                            <AntiPhishing image={antiPhishingImage} />
                        </div>
                    )}
                </div>
            </div>
        </PopupLayout>
    )
}

export default UnlockPage
