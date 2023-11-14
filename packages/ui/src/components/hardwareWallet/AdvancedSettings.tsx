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

export const AccountsPageAdvancedSettings = ({
    currentHDPath,
    vendor,
    disabled,
    setHDPath,
}: {
    currentHDPath: string
    vendor: Devices
    disabled?: boolean
    setHDPath: (hdPath: string) => void
}) => {
    const [openModal, setOpenModal] = useState(false)
    const hdPaths = HDPaths[vendor]
    const [selectedHDPath, setSelectedHDPath] = useState<string>(currentHDPath)

    useEffect(() => {
        setSelectedHDPath(currentHDPath)
    }, [currentHDPath])

    const ref = useRef<any>(null)
    useOnClickOutside(ref, () => {
        setOpenModal(false)
    })
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
                <span className="font-semibold text-base text-black">
                    Advanced Settings
                </span>
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
                    <span>
                        If you don't see the accounts you're expecting, try
                        switching the HD path.
                    </span>
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
                            onClick={() => {
                                setHDPath(selectedHDPath)
                                setOpenModal(false)
                            }}
                            className={classnames(Classes.button)}
                        >
                            Save
                        </button>
                    </div>
                </div>
            </FullScreenDialog>
        </>
    )
}
