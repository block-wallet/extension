import { useState } from "react"

import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import Divider from "../../components/Divider"
import PopupFooter from "../../components/popup/PopupFooter"
import TextInput from "../../components/input/TextInput"

import * as yup from "yup"
import { yupResolver } from "@hookform/resolvers/yup"
import { useForm } from "react-hook-form"
import { useOnMountHistory } from "../../context/hooks/useOnMount"
import {
    useAddressBook,
    useAddressBookRecentAddresses,
} from "../../context/hooks/useAddressBook"
import { isValidAddress } from "ethereumjs-util"
import { addressBookSet } from "../../context/commActions"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import WaitingDialog, {
    useWaitingDialog,
} from "../../components/dialog/WaitingDialog"

// new contact schema
const contactSchema = yup.object().shape({
    contactName: yup
        .string()
        .test("is-empty", "Contact name is empty.", (s) => {
            return !!s && s.trim().length > 0
        })
        .max(40, "Contact name is too long"),
    contactAddress: yup
        .string()
        .required("No address provided.")
        .test("is-correct", "Address is incorrect.", (address) => {
            return isValidAddress(address || "")
        }),
})
type contactFormData = { contactName: string; contactAddress: string }

const AddContactPage = () => {
    const history = useOnMountHistory()
    const addressBook = useAddressBook()
    const recentAddresses = useAddressBookRecentAddresses()
    const {
        register,
        handleSubmit,
        setError,

        formState: { errors },
    } = useForm<contactFormData>({
        resolver: yupResolver(contactSchema),
    })
    const { status, isOpen, dispatch } = useWaitingDialog()

    const { editMode, contact } = history.location.state

    const [canUpdate, setCanUpdate] = useState(!editMode)

    const pageTitle = editMode ? "Edit Contact" : "New Contact"
    const buttonTitle = editMode ? "Update" : "Create"

    const placeholderСontactName = `Contact ${
        Object.keys(addressBook).length + 1
    }`

    const contactNameExists = (name: string) => {
        return (
            Object.values(addressBook).some((a) => a.name === name) ||
            Object.values(recentAddresses).some((a) => a.name === name)
        )
    }

    const onSubmit = handleSubmit(async (data: contactFormData) => {
        try {
            if (contactNameExists(data.contactName || "")) {
                setError(
                    "contactName",
                    {
                        message: "Contact Name already in use",
                    },
                    {
                        shouldFocus: true,
                    }
                )

                return Promise.reject()
            }
            dispatch({ type: "open", payload: { status: "loading" } })

            await addressBookSet(
                data.contactAddress,
                data.contactName ? data.contactName : placeholderСontactName,
                ""
            )

            dispatch({ type: "setStatus", payload: { status: "success" } })
        } catch {
            setError(
                "contactName",
                {
                    message: "Error saving the new contact.",
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
                    title={pageTitle}
                    close="/"
                    onBack={() => history.push("/settings/addressBook")}
                />
            }
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        label={buttonTitle}
                        onClick={onSubmit}
                        disabled={!canUpdate}
                    />
                </PopupFooter>
            }
        >
            <Divider />
            <div className="flex flex-col w-full justify-between flex-1 h-full">
                <div className="flex flex-col flex-1 p-6 space-y-3">
                    <div className="flex flex-col space-y-1">
                        <TextInput
                            appearance="outline"
                            label="Contact Name"
                            {...register("contactName", {
                                onChange: () => {
                                    setCanUpdate(true)
                                },
                            })}
                            placeholder={placeholderСontactName}
                            error={errors.contactName?.message}
                            autoFocus={true}
                            maxLength={40}
                            defaultValue={
                                contact?.name || placeholderСontactName
                            }
                        />
                    </div>
                    <div className="flex flex-col space-y-1">
                        <TextInput
                            appearance="outline"
                            label="Contact Address"
                            placeholder="Address"
                            error={errors.contactAddress?.message}
                            autoFocus={false}
                            defaultValue={contact?.address}
                            {...register("contactAddress", {
                                onChange: () => {
                                    setCanUpdate(true)
                                },
                            })}
                        />
                    </div>
                </div>
                <hr className="border-0.5 border-primary-grey-hover w-full" />
            </div>
            <WaitingDialog
                open={isOpen}
                status={status}
                titles={{
                    loading: "Loading",
                    success: "Congratulations",
                    error: "Error",
                }}
                texts={{
                    loading: "Saving your changes...",
                    success: "Your changes have been succesfully saved!",
                    error:
                        errors.contactName?.message ??
                        "There was an error while saving your changes.",
                }}
                timeout={800}
                onDone={() => {
                    if (status === "error") {
                        dispatch({ type: "close" })
                        return
                    }

                    history.push({
                        pathname: "/settings/addressBook",
                        state: { fromAction: true },
                    })
                }}
            />
        </PopupLayout>
    )
}

export default AddContactPage
