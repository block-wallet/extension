import { useEffect, useState } from "react"

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
import { useCheckUserIsOnboarded } from "../../context/hooks/useCheckUserIsOnboarded"

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
        .required("Please enter the password confirmation.")
        .oneOf(
            [yup.ref("password"), null],
            "Password and password confirmation must match."
        ),
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
    const [isSubmitDisabled, setIsSubmitDisabled] = useState(true)
    // if the onboarding is ready the user shoulnd't set the password again.
    useCheckUserIsOnboarded()

    const { register, handleSubmit, setError, watch, formState, trigger } =
        useForm<PasswordSetupFormData>({
            mode: "onChange",
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

    const passwordValues = watch()
    useEffect(() => {
        if (formState.isValid) {
            setIsSubmitDisabled(false)
        } else {
            setIsSubmitDisabled(true)
        }
    }, [passwordValues, formState.errors.password])

    useEffect(() => {
        // trigger password confirmation validation when password changes given that there is a value in both fields
        if (passwordValues.password && passwordValues.passwordConfirmation) {
            trigger("passwordConfirmation")
        }
    }, [passwordValues.password, trigger])
    return (
        <PageLayout header maxWidth="max-w-md">
            <span className="my-6 text-lg font-semibold">
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
                            error={formState.errors.password?.message}
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
                            error={
                                formState.errors.passwordConfirmation?.message
                            }
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
                                    className="text-primary-blue-default"
                                >
                                    Terms of Use
                                </a>
                            </label>
                        </div>
                        <span className="text-xs text-red-500">
                            {formState.errors.acceptTOU?.message || <>&nbsp;</>}
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
                        disabled={isCreating || isSubmitDisabled}
                    ></ButtonWithLoading>
                </div>
            </form>
        </PageLayout>
    )
}

export default PasswordSetupPage
