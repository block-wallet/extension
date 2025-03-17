import classnames from "classnames"
import { useState, useEffect, useRef } from "react"
import { AiFillInfoCircle } from "react-icons/ai"
import { Devices, HDPaths } from "../../context/commTypes"
import { Classes } from "../../styles"
import { LINKS } from "../../util/constants"
import { useOnClickOutside } from "../../util/useOnClickOutside"
import Divider from "../Divider"
import FullScreenDialog from "../dialog/FullScreenDialog"
import CloseIcon from "../icons/CloseIcon"
import Select from "../input/Select"
import Tooltip from "../label/Tooltip"
import Icon, { IconName } from "../ui/Icon"
import Spinner from "../spinner/Spinner"

interface AccountsPageAdvancedSettingsProps {
    currentHDPath: string
    vendor: Devices
    disabled?: boolean
    setHDPath: (hdPath: string) => void
    isLoadingHDPath?: boolean
}

/**
 * Enhanced component for displaying and managing hardware wallet advanced settings
 */
export const AccountsPageAdvancedSettings = ({
    currentHDPath,
    vendor,
    disabled = false,
    setHDPath,
    isLoadingHDPath = false,
}: AccountsPageAdvancedSettingsProps) => {
    const [openModal, setOpenModal] = useState(false)
    const hdPaths = HDPaths[vendor]
    const [selectedHDPath, setSelectedHDPath] = useState<string>(currentHDPath)
    const [isUpdating, setIsUpdating] = useState(false)

    useEffect(() => {
        setSelectedHDPath(currentHDPath)
    }, [currentHDPath])

    const ref = useRef<any>(null)
    useOnClickOutside(ref, () => {
        setOpenModal(false)
    })

    // Get description for the current HD path
    const getHDPathDescription = () => {
        if (vendor === Devices.LEDGER) {
            if (currentHDPath === "m/44'/60'/0'/0") {
                return "Ledger Legacy"
            } else if (currentHDPath === "m/44'/60'/0'/0/0") {
                return "Ledger Live"
            }
        }
        return "Standard BIP44"
    }

    // Handle HD path update with loading state
    const handleUpdateHDPath = async () => {
        try {
            setIsUpdating(true)
            setHDPath(selectedHDPath)
            // Simulate waiting for backend update
            await new Promise(resolve => setTimeout(resolve, 500))
        } finally {
            setIsUpdating(false)
            setOpenModal(false)
        }
    }

    // If loading the HD path, show a spinner
    if (isLoadingHDPath) {
        return (
            <div className="flex justify-center items-center p-4">
                <Spinner color="blue" size="24" />
            </div>
        )
    }

    return (
        <>
            <div
                onClick={() => !disabled && setOpenModal(true)}
                className={classnames(
                    "w-full pl-2 pt-4 bg-white rounded-md cursor-pointer underline-offset-1 flex items-center justify-between",
                    disabled
                        ? "text-gray-200 !cursor-not-allowed"
                        : "hover:underline"
                )}
            >
                <div className="flex flex-col">
                    <span className="font-semibold text-base text-black">
                        Advanced Settings
                    </span>
                    <span className="text-xs text-primary-grey-dark">
                        Current Path: {currentHDPath} ({getHDPathDescription()})
                    </span>
                </div>
                <div>
                    <Icon
                        name={IconName.RIGHT_CHEVRON}
                        size="sm"
                        profile={disabled ? "disabled" : "default"}
                    />
                </div>
            </div>

            <FullScreenDialog open={openModal}>
                <div className="flex items-center justify-between px-6 pb-6">
                    <div className="flex flex-row items-center">
                        <span className="p-0 text-xl font-semibold text-black">
                            Advanced Settings
                        </span>
                        <div className="group relative">
                            <a
                                target="_blank"
                                href={LINKS.ARTICLES.HD_PATH}
                                rel="noreferrer"
                            >
                                <AiFillInfoCircle
                                    size={26}
                                    className="pl-2 text-primary-grey-dark cursor-pointer hover:text-primary-blue-default"
                                />
                            </a>
                            <Tooltip
                                className="!w-52 !break-word !whitespace-normal"
                                content="Click here to learn what the HD Path is and the implications of changing it."
                            />
                        </div>
                    </div>
                    <div
                        onClick={() => setOpenModal(false)}
                        className=" cursor-pointer p-2 text-gray-900 transition duration-300 rounded-full hover:bg-primary-grey-default hover:text-primary-blue-default"
                    >
                        <CloseIcon size="12" />
                    </div>
                </div>
                <Divider />
                <div className="flex flex-col w-full space-y-6 p-6">
                    <div className="text-sm space-y-2">
                        <p>
                            If you don't see the accounts you're expecting, try
                            switching the HD path.
                        </p>
                        {vendor === Devices.LEDGER && (
                            <div className="bg-gray-50 p-3 rounded text-xs">
                                <p className="font-bold">Ledger HD Paths:</p>
                                <ul className="list-disc pl-5 mt-1 space-y-1">
                                    <li>Ledger Live path: m/44'/60'/0'/0/x</li>
                                    <li>Ledger Legacy path: m/44'/60'/0'/x</li>
                                </ul>
                                <p className="mt-2 italic">
                                    Use the Ledger Live path if you created accounts in Ledger Live.
                                    Use Legacy if you've used your Ledger with older applications.
                                </p>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col space-y-2">
                        <label>HD Path</label>
                        <Select
                            onChange={setSelectedHDPath}
                            currentValue={selectedHDPath}
                        >
                            {hdPaths.map((hdPath) => (
                                <Select.Option
                                    value={hdPath.path}
                                    key={hdPath.path}
                                >
                                    {hdPath.name}
                                </Select.Option>
                            ))}
                        </Select>
                    </div>
                </div>

                <div className="flex flex-col px-6">
                    <hr className="absolute left-0 border-0.5 border-primary-grey-hover w-full" />
                    <div className="flex flex-row w-full items-center pt-5 justify-between space-x-4">
                        <button
                            className={classnames(Classes.liteButton)}
                            onClick={() => setOpenModal(false)}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleUpdateHDPath}
                            disabled={isUpdating}
                            className={classnames(Classes.button)}
                        >
                            {isUpdating ? (
                                <div className="flex items-center">
                                    <Spinner color="white" size="16" />
                                    <span className="ml-2">Updating...</span>
                                </div>
                            ) : (
                                "Save"
                            )}
                        </button>
                    </div>
                </div>
            </FullScreenDialog>
        </>
    )
}
