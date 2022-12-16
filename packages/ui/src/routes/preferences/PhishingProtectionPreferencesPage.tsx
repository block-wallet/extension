import { useState } from "react"
import { ButtonWithIcon } from "../../components/button/ButtonWithIcon"
import ToggleButton from "../../components/button/ToggleButton"
import AntiPhishing from "../../components/phishing/AntiPhishing"
import PopupHeader from "../../components/popup/PopupHeader"
import PopupLayout from "../../components/popup/PopupLayout"
import { useBlankState } from "../../context/background/backgroundHooks"
import refresh from "../../assets/images/icons/refresh.svg"
import PopupFooter from "../../components/popup/PopupFooter"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import {
    toggleAntiPhishingProtection,
    updateAntiPhishingImage,
} from "../../context/commActions"
import log from "loglevel"
import SuccessDialog from "../../components/dialog/SuccessDialog"
import { useHistory } from "react-router-dom"
import { generatePhishingPreventionBase64 } from "../../util/phishingPrevention"

const PhishingProtectionPreferencesPage = () => {
    const history = useHistory()
    const [isLoading, setIsLoading] = useState(false)
    const { antiPhishingImage, settings } = useBlankState()!
    const [newPhishingImage, setNewPhishingImage] = useState(antiPhishingImage)
    const [showSuccessDialog, setShowSuccessDialog] = useState<boolean>(false)
    const [phishingEnabled, setPhishingEnabled] = useState(
        settings.useAntiPhishingProtection
    )
    const isDirtyEnabled =
        phishingEnabled !== settings.useAntiPhishingProtection
    const isDirtyImage = antiPhishingImage !== newPhishingImage

    const isDirty = isDirtyEnabled || isDirtyImage
    const onSave = async () => {
        try {
            setIsLoading(true)
            if (isDirtyEnabled) {
                await toggleAntiPhishingProtection(phishingEnabled)
            }
            //only update phishing image if it is turned on.
            if (isDirtyImage && phishingEnabled) {
                await updateAntiPhishingImage(newPhishingImage)
            }
            setShowSuccessDialog(true)
        } catch (e) {
            throw new Error("Could not update Anti Phishing information")
        } finally {
            setIsLoading(false)
        }
    }

    const refreshImage = async () => {
        try {
            const newImage = await generatePhishingPreventionBase64()
            setNewPhishingImage(newImage)
        } catch (e) {
            log.error("error generating the phishing prevention image")
        }
    }
    return (
        <PopupLayout
            header={<PopupHeader title="Phishing Protection" close="/" />}
            footer={
                <PopupFooter>
                    <ButtonWithLoading
                        label="Save"
                        disabled={!isDirty}
                        onClick={onSave}
                        isLoading={isLoading}
                    />
                </PopupFooter>
            }
        >
            <SuccessDialog
                open={showSuccessDialog}
                title="Phishing Protection"
                timeout={800}
                message="Your changes have been succesfully saved!"
                onDone={history.goBack}
            />
            <div className="flex flex-col p-6 space-y-6 w-full">
                <span className="text-sm text-gray-500">
                    The following image is uniquely created for you to prevent
                    phishing attempts. Ensure this graphic is on every
                    login/seed phrase page.
                </span>
                <ToggleButton
                    label="Use Phishing Protection"
                    defaultChecked={phishingEnabled}
                    onToggle={(checked: boolean) => {
                        setPhishingEnabled(checked)
                    }}
                />
                {phishingEnabled && (
                    <>
                        <div className="mt-1">
                            <AntiPhishing image={newPhishingImage} />
                        </div>
                        <ButtonWithIcon
                            icon={refresh}
                            label="Regenerate Image"
                            onClick={refreshImage}
                        />
                    </>
                )}
            </div>
        </PopupLayout>
    )
}

export default PhishingProtectionPreferencesPage
