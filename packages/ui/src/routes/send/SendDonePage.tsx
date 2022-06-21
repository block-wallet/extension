import React, { useMemo } from "react"

import PopupFooter from "../../components/popup/PopupFooter"
import PopupLayout from "../../components/popup/PopupLayout"

import arrow from "../../assets/images/icons/arrow_right.svg"
import { useBlankState } from "../../context/background/backgroundHooks"
import LinkButton from "../../components/button/LinkButton"
import { generateExplorerLink, getExplorerTitle } from "../../util/getExplorer"
import AnimatedIcon, { AnimatedIconName } from "../../components/AnimatedIcon"
import { useOnMountHistory } from "../../context/hooks/useOnMount"

const SendConfirmPage = () => {
    const currentHistory = useOnMountHistory()
    const history = useMemo(() => currentHistory as any, [])
    const txHash = history.location.state.txHash

    const { selectedNetwork, availableNetworks } = useBlankState()!
    const explorerName = getExplorerTitle(availableNetworks, selectedNetwork)
    return (
        <PopupLayout
            footer={
                <PopupFooter>
                    <LinkButton location="/" text="Done" classes="w-full" />
                </PopupFooter>
            }
        >
            <div className="flex flex-col items-center justify-center w-full h-full">
                <div className="flex flex-col items-center space-y-4">
                    <AnimatedIcon
                        icon={AnimatedIconName.Success}
                        className="w-24 h-24 pointer-events-none"
                    />
                    <span className="text-2xl font-bold text-gray-900">
                        Success.
                    </span>
                    <span className="w-48 text-sm text-center text-gray-700">
                        You've initiated the transfer.
                    </span>
                    <a
                        href={generateExplorerLink(
                            availableNetworks,
                            selectedNetwork,
                            txHash,
                            "tx"
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-row items-center space-x-2 text-sm font-bold text-primary-300"
                    >
                        <span>View on {explorerName}</span>
                        <img src={arrow} alt="arrow" className="w-3 h-3" />
                    </a>
                </div>
            </div>
        </PopupLayout>
    )
}

export default SendConfirmPage
