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
import { BsShieldFill, BsInfoCircle, BsEyeFill, BsExclamationTriangle } from "react-icons/bs"

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
            header={
                <PopupHeader
                    title="Phishing Protection"
                    close="/"
                    onBack={() => history.push("/settings/preferences")}
                />
            }
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
                message="Your changes have been successfully saved!"
                onDone={history.goBack}
            />

            <div className="flex flex-col p-6 space-y-6 w-full">
                {/* Information Panel */}
                <div className="bg-blue-50 dark:bg-gray-800 p-4 rounded-lg border border-blue-200 dark:border-gray-700">
                    <div className="flex items-start space-x-3">
                        <BsShieldFill className="text-blue-600 dark:text-blue-400 text-lg mt-0.5 flex-shrink-0" />
                        <div>
                            <h3 className="text-base font-semibold text-blue-800 dark:text-blue-200 mb-2">
                                Anti-Phishing Protection
                            </h3>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                Protect yourself from phishing attacks with a unique visual identifier
                                that only appears on legitimate BlockWallet pages.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Status Display */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Protection Status:
                        </span>
                        <span className={`text-sm font-semibold ${phishingEnabled
                            ? "text-green-600 dark:text-green-400"
                            : "text-orange-600 dark:text-orange-400"
                            }`}>
                            {phishingEnabled ? "Enabled" : "Disabled"}
                        </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {phishingEnabled
                            ? "Your unique image will appear on all legitimate BlockWallet pages."
                            : "Phishing protection is currently disabled."
                        }
                    </p>
                </div>

                {/* Toggle Section */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                Enable Phishing Protection
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Turn on anti-phishing protection to see your unique image on login and seed phrase pages.
                            </p>
                        </div>
                        <ToggleButton
                            label="Use Phishing Protection"
                            defaultChecked={phishingEnabled}
                            onToggle={(checked: boolean) => {
                                setPhishingEnabled(checked)
                            }}
                        />
                    </div>
                </div>

                {/* Anti-Phishing Image Section */}
                {phishingEnabled && (
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="space-y-4">
                            <div className="flex items-start space-x-3">
                                <BsEyeFill className="text-green-500 dark:text-green-400 text-lg mt-0.5 flex-shrink-0" />
                                <div>
                                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                        Your Unique Protection Image
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                        This image is uniquely generated for your wallet. Always verify it appears
                                        on login and seed phrase pages to ensure you're using the real BlockWallet.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                                <AntiPhishing image={newPhishingImage} />
                            </div>

                            <div className="flex justify-center">
                                <ButtonWithIcon
                                    icon={refresh}
                                    label="Generate New Image"
                                    onClick={refreshImage}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* How It Works Section */}
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-start space-x-3">
                        <BsInfoCircle className="text-green-600 dark:text-green-400 text-lg mt-0.5 flex-shrink-0" />
                        <div>
                            <h4 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">
                                How Phishing Protection Works
                            </h4>
                            <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                                <p>• Your unique image appears on all legitimate wallet pages</p>
                                <p>• Phishing sites cannot replicate your specific image</p>
                                <p>• If you don't see your image, DO NOT enter sensitive information</p>
                                <p>• Always verify the image before entering passwords or seed phrases</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Security Warning */}
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start space-x-3">
                        <BsExclamationTriangle className="text-amber-600 dark:text-amber-400 text-lg mt-0.5 flex-shrink-0" />
                        <div>
                            <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">
                                Security Reminder
                            </h4>
                            <div className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                                <p>• <span className="font-medium">Remember your image:</span> Take a mental note of its unique pattern</p>
                                <p>• <span className="font-medium">Stay vigilant:</span> Phishing sites may look identical to BlockWallet</p>
                                <p>• <span className="font-medium">When in doubt:</span> Close the page and access wallet directly</p>
                                <p>• <span className="font-medium">Never disable:</span> Keep this protection enabled for maximum security</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PopupLayout>
    )
}

export default PhishingProtectionPreferencesPage
