import { useState } from "react"
import { useHistory } from "react-router-dom"

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
import { BiShield } from "react-icons/bi"
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
                                    size={24}
                                    className="pl-2 text-gray-500 dark:text-gray-400 cursor-pointer hover:text-primary-blue-default dark:hover:text-primary-blue-400 transition-colors duration-200"
                                />
                                <Tooltip
                                    placement="bottom"
                                    align="center"
                                    autoFlip
                                    wrap
                                    className="!w-56"
                                    content="Locked too soon? Click to learn how to increase the lock timeout."
                                />
                            </a>
                        </div>
                    )}
                </PopupHeader>
            }
            footer={
                <div className="flex flex-row w-full items-center space-x-4 py-3 px-6 mt-auto">
                    <ButtonWithLoading
                        label="Unlock Wallet"
                        isLoading={isLoading}
                        onClick={onSubmit}
                        disabled={!!errors.password}
                    />
                </div>
            }
            submitOnEnter={{
                onSubmit,
                isFormValid: Object.keys(errors).length === 0,
            }}
        >
            <ConfirmDialog
                title="Reset Wallet"
                message="Are you sure you want to reset your wallet? This action cannot be undone and you will lose access to your funds unless you have your seed phrase backed up."
                open={hasDialog}
                onClose={() => setHasDialog(false)}
                onConfirm={() => openReset()}
            />

            <div className="flex flex-col h-full">
                {/* Main Content */}
                <div className="flex-1 flex flex-col justify-center px-5 py-3 space-y-3">
                    {/* Logo and Title Section */}
                    <div className="flex flex-col items-center space-y-3">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-primary-blue-default/15 to-purple-500/15 rounded-full blur-md"></div>
                            <div className="relative bg-white dark:bg-gray-800 rounded-full p-2.5 shadow-md border border-gray-200 dark:border-gray-700">
                                <img
                                    src={logo}
                                    alt="BlockWallet logo"
                                    className="w-9 h-9"
                                />
                            </div>
                        </div>

                        <div className="text-center space-y-0.5">
                            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                                Welcome Back
                            </h1>
                            <p className="text-[11px] text-gray-600 dark:text-gray-400">
                                Enter your password to unlock your wallet
                            </p>
                        </div>
                    </div>

                    {/* Security Info Banner */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2.5 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center space-x-2">
                            <BiShield className="text-blue-600 dark:text-blue-400 w-4 h-4 flex-shrink-0" />
                            <div>
                                <p className="text-[11px] font-medium text-blue-800 dark:text-blue-200">
                                    Secure Access
                                </p>
                                <p className="text-[11px] text-blue-600 dark:text-blue-300">
                                    Your wallet is protected with end-to-end encryption
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Password Input Section */}
                    <div className="space-y-2.5">
                        <div className="space-y-1.5">
                            <PasswordInput
                                label="Password"
                                placeholder="Enter your password"
                                {...register("password")}
                                error={errors.password?.message}
                                autoFocus={isUserNetworkOnline}
                            />
                        </div>

                        {/* Reset Option */}
                        <div className="text-center">
                            <div className="text-[11px] text-gray-500 dark:text-gray-400">
                                Forgot your password?{" "}
                                <ClickableText
                                    onClick={() => setHasDialog(true)}
                                    className="text-primary-blue-default dark:text-primary-blue-400 hover:text-primary-blue-hover dark:hover:text-primary-blue-300 font-medium"
                                >
                                    Reset wallet with seed phrase
                                </ClickableText>
                            </div>
                        </div>

                        {/* Anti-Phishing Section */}
                        {settings.useAntiPhishingProtection && (
                            <div className="pt-1.5 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex justify-center">
                                    <AntiPhishing image={antiPhishingImage} size="sm" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </PopupLayout>
    )
}

export default UnlockPage
