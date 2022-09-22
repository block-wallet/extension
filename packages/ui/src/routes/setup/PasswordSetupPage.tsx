import { useState } from "react"

import { Classes } from "../../styles/classes"

import PageLayout from "../../components/PageLayout"
import Divider from "../../components/Divider"
import LinkButton from "../../components/button/LinkButton"
import PasswordInput from "../../components/input/PasswordInput"

import { useForm } from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import * as yup from "yup"

import { createWallet, requestSeedPhrase } from "../../context/commActions"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import log from "loglevel"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"

const schema = yup.object().shape({
    password: yup
        .string()
        .required("No password provided.")
        .min(8, "Password should be at least 8 characters long.")
        .matches(
            /(?=.*\d)(?=.*[a-z])/,
            "Password must contain at least one lowercase character and one digit."
        ),
    passwordConfirmation: yup
        .string()
        .required("Required")
        .oneOf([yup.ref("password"), null], "Passwords must match."),
    acceptTOU: yup
        .bool()
        .required("You must accept the Terms of Use.")
        .oneOf([true], "You must accept the Terms of Use."),
})
type PasswordSetupFormData = {
    password: string
    passwordConfirmation: string
    acceptTOU: boolean
}

const PasswordSetupPage = () => {
    const history = useOnMountHistory()
    const [passwordScore, setPasswordScore] = useState<number>(0)
    const [isCreating, setIsCreating] = useState<boolean>(false)

    const {
        register,
        handleSubmit,
        setError,

        formState: { errors },
    } = useForm<PasswordSetupFormData>({
        resolver: yupResolver(schema),
    })
    const onSubmit = handleSubmit(async (data: PasswordSetupFormData) => {
        if (passwordScore < 3) {
            return setError(
                "password",
                {
                    message: "Password is not strong enough",
                },
                {
                    shouldFocus: true,
                }
            )
        }

        setIsCreating(true)

        createWallet(data.password)
            .then(() => {
                requestSeedPhrase(data.password)
                    .then((seedPhrase) => {
                        setIsCreating(false)
                        history.push({
                            pathname: "/setup/create/notice",
                            state: { seedPhrase, password: data.password },
                        })
                    })
                    .catch((err) => {
                        log.error(err)
                        setIsCreating(false)
                    })
            })
            .catch((err) => {
                log.error(err)
                setIsCreating(false)
            })
    })

    return (
        <PageLayout header maxWidth="max-w-md">
            <span className="my-6 text-lg font-bold font-title">
                Create a Password
            </span>
            <Divider />
            <form className="flex flex-col w-full" onSubmit={onSubmit}>
                <div className="flex flex-col p-6 space-y-4">
                    <div className="flex flex-col space-y-1">
                        <PasswordInput
                            label="New Password"
                            placeholder="Enter New Password"
                            {...register("password")}
                            error={errors.password?.message}
                            autoFocus={true}
                            strengthBar={true}
                            setPasswordScore={setPasswordScore}
                        />
                    </div>
                    <div className="flex flex-col space-y-1">
                        <PasswordInput
                            label="Confirm password"
                            placeholder="Confirm New Password"
                            {...register("passwordConfirmation")}
                            error={errors.passwordConfirmation?.message}
                        />
                    </div>
                    <div className="flex flex-col space-y-1">
                        <div className="flex flex-row items-center space-x-2">
                            <input
                                type="checkbox"
                                className={Classes.checkbox}
                                id="acceptTOU"
                                {...register("acceptTOU")}
                            />
                            <label htmlFor="acceptTOU" className="text-xs">
                                I have read and agree to the{" "}
                                <a
                                    href="https://blockwallet.io/terms-of-use-of-block-wallet.html"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500"
                                >
                                    Terms of Use
                                </a>
                            </label>
                        </div>
                        <span className="text-xs text-red-500">
                            {errors.acceptTOU?.message || <>&nbsp;</>}
                        </span>
                    </div>
                </div>
                <Divider />
                <div className="flex flex-row p-6 space-x-4">
                    <LinkButton
                        location="/setup/"
                        text="Back"
                        lite
                        disabled={isCreating}
                    />
                    <ButtonWithLoading
                        label="Create"
                        isLoading={isCreating}
                        onClick={onSubmit}
                        buttonClass={Classes.button}
                    ></ButtonWithLoading>
                </div>
            </form>
        </PageLayout>
    )
}

export default PasswordSetupPage
