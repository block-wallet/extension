import React, { FunctionComponent, useEffect, useRef, useState } from "react"
import { Classes, classnames } from "../../styles"
import { useOnClickOutside } from "../../util/useOnClickOutside"
import ToggleButton from "../button/ToggleButton"
import Dialog from "../dialog/Dialog"
import { ArrowUpDown } from "../icons/ArrowUpDown"
import { TransactionAdvancedData } from "@block-wallet/background/controllers/transactions/utils/types"
import Divider from "../Divider"
import CloseIcon from "../icons/CloseIcon"
import { getNextNonce } from "../../context/commActions"
import { ButtonWithLoading } from "../../components/button/ButtonWithLoading"
import Tooltip from "../label/Tooltip"
import { AiFillInfoCircle } from "react-icons/ai"
import { BigNumber } from "ethers"

export interface AdvancedSettingsConfig {
    address: string
    showCustomNonce: boolean
    showFlashbots: boolean
    gasLimit?: BigNumber
}

/**
 * AdvancedSettings:
 * Opens a Dialog where the user can customize some transaction advanced settings.
 * The settings that the modal will display depend on the config parameter and the default values
 * come from the data parameter.
 * @param config - Object containing properties that will be shown.
 * @param data - Object containing defautl values for each property.
 * @param setData - Triggered when any value gets changed. Implemented from parent components to modify state or tx values.
 */
export const AdvancedSettings: FunctionComponent<{
    config: AdvancedSettingsConfig
    data: TransactionAdvancedData
    setData: (data: TransactionAdvancedData) => void
}> = ({ config, data, setData }) => {
    const [isActive, setIsActive] = useState(false)
    const [userChanged, setUserChanged] = useState(false)

    const ref = useRef<any>(null)
    useOnClickOutside(ref, () => {
        setIsActive(false)
    })

    const [
        advancedSettingsData,
        setAdvancedSettingsData,
    ] = useState<TransactionAdvancedData>(data)

    const nextNonce = useRef(0)
    useEffect(() => {
        const fetch = async () => {
            nextNonce.current = await getNextNonce(config.address)
        }
        fetch()
    }, [config.address])

    return (
        <>
            <div
                onClick={() => setIsActive(true)}
                className="w-full p-4 bg-white border border-gray-200 hover:border-black rounded-md cursor-pointer flex items-center justify-between"
            >
                <span className="font-bold text-xs">Advanced Settings</span>
                <div>
                    <ArrowUpDown active={isActive} />
                </div>
            </div>

            <Dialog open={isActive}>
                <span className="absolute top-0 right-0 p-4 z-50">
                    <div
                        onClick={() => setIsActive(false)}
                        className=" cursor-pointer p-2 ml-auto -mr-2 text-gray-900 transition duration-300 rounded-full hover:bg-primary-100 hover:text-primary-300"
                    >
                        <CloseIcon size="10" />
                    </div>
                </span>
                <div className="flex flex-col w-full space-y-4 p-2" ref={ref}>
                    <span className="p-0 text-base font-bold">
                        Advanced Settings
                    </span>

                    {/*Custom Nonce*/}
                    {config.showCustomNonce && (
                        <div className="flex flex-col space-y-1">
                            <span className="text-xs font-medium">
                                Custom Nonce
                            </span>
                            <input
                                name="customNonce"
                                type="number"
                                className={classnames(Classes.inputBordered)}
                                min={0}
                                autoComplete="off"
                                defaultValue={
                                    advancedSettingsData.customNonce ??
                                    nextNonce.current
                                }
                                onChange={(e) => {
                                    setUserChanged(true)

                                    setAdvancedSettingsData({
                                        ...advancedSettingsData,
                                        customNonce: +e.target.value,
                                    })
                                }}
                            />
                        </div>
                    )}

                    {/*Flashbots*/}
                    {config.showFlashbots && (
                        <div className="flex flex-col space-y-1">
                            <div className="flex space-x-1 items-center">
                                <span className="text-xs font-medium ">
                                    Flashbots
                                </span>
                                <div className="group relative">
                                    <AiFillInfoCircle
                                        size={20}
                                        className="pl-1 text-primary-200  hover:text-primary-300"
                                    />
                                    <Tooltip
                                        content={
                                            <div className="flex flex-col font-normal items-start text-xs text-white-500">
                                                <div className="flex flex-row items-end space-x-7">
                                                    <span>
                                                        Transactions consuming
                                                        less than 42,000 gas
                                                        <br />
                                                        will be mined normally,
                                                        without Flashbots.
                                                    </span>
                                                </div>
                                            </div>
                                        }
                                    />
                                </div>
                            </div>
                            <ToggleButton
                                defaultChecked={
                                    advancedSettingsData.flashbots ?? false
                                }
                                inputName="flashbots"
                                //Flashbots disabled when Gas Limit is under 42k
                                disabled={config.gasLimit!.lt(
                                    BigNumber.from(42000)
                                )}
                                onToggle={(checked) => {
                                    setUserChanged(true)

                                    setAdvancedSettingsData({
                                        ...advancedSettingsData,
                                        flashbots: checked,
                                    })
                                }}
                            />
                        </div>
                    )}
                    <>
                        <div className="-mx-6">
                            <Divider />
                        </div>

                        <ButtonWithLoading
                            label="Save"
                            disabled={!userChanged}
                            buttonClass={Classes.button}
                            onClick={() => {
                                setData(advancedSettingsData)
                                setIsActive(false)
                            }}
                        />
                    </>
                </div>
            </Dialog>
        </>
    )
}
