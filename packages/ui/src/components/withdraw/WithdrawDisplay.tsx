import React, { useEffect, useState, useRef } from "react"

// Components
import ComplianceMenu from "../../components/withdraw/ComplianceMenu"
import MenuIcon from "../../components/icons/MenuIcon"

// Context
import { useTokensList } from "../../context/hooks/useTokensList"

// Utils
import { getDisplayTime } from "../../util/getDisplayTime"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"

// Types
type WithdrawDisplayType = { withdraw: any }
type CurrentAsset = {
    symbol: string
    logo: string
}

/**
 * WithdrawDisplay:
 * Display a tornado withdraw transaction with a <ComplianceMenu/>.
 *
 * @param withdraw - A state tornado withdrawal transaction.
 */
const WithdrawDisplay = (props: WithdrawDisplayType) => {
    const { withdraw } = props
    const { currentNetworkTokens } = useTokensList()
    const { nativeCurrency, defaultNetworkLogo } = useSelectedNetwork()

    const [currentAsset, setCurrentAsset] = useState<CurrentAsset>()
    const [active, setActive] = useState<boolean>(false)
    const [menuPosition, setMenuPosition] = useState<string>("top")

    const menuIconRef = useRef(null)

    useEffect(() => {
        for (let i = 0; i < currentNetworkTokens.length; i++) {
            if (
                withdraw.pair.currency.toLowerCase() ===
                currentNetworkTokens[i].token.symbol.toLowerCase()
            ) {
                setCurrentAsset({
                    symbol: currentNetworkTokens[i].token.symbol,
                    logo: currentNetworkTokens[i].token.logo,
                })
            }
        }

        getMenuPosition()
    }, [currentNetworkTokens, withdraw.pair.currency])

    const getMenuPosition = () => {
        const menuIcon: any = menuIconRef.current
        if (!menuIcon) return false

        const distToBottom =
            window.innerHeight - menuIcon.getBoundingClientRect().top

        if (distToBottom < 120) {
            setMenuPosition("bottom")
        }
    }

    return (
        <div className="flex flex-row justify-between items-center w-full h-10 my-3">
            {/* Infos */}
            <div className="flex flex-row items-center">
                {/* Icon */}
                <div className="flex justify-center items-center w-10 h-10 mr-3 rounded-full border border-gray-200">
                    <img
                        src={
                            currentAsset
                                ? currentAsset.logo
                                : defaultNetworkLogo
                        }
                        onError={(e) => {
                            ;(e.target as any).onerror = null
                            ;(e.target as any).src = defaultNetworkLogo
                        }}
                        alt={
                            currentAsset
                                ? currentAsset.symbol
                                : nativeCurrency.symbol
                        }
                        className="w-6 h-6"
                    />
                </div>
                {/* Display */}
                <div className="flex flex-col justify-center items-start">
                    <span className="font-semibold text-sm text-gray-900 mb-0.5">
                        {withdraw.pair.amount}{" "}
                        {withdraw.pair.currency.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-600">
                        {getDisplayTime(new Date(withdraw.time))}
                    </span>
                </div>
            </div>
            {/* Menu */}
            <div
                className="relative z-50 p-2 transition duration-300 rounded-full hover:bg-primary-100 hover:text-primary-300 cursor-pointer"
                onClick={() => setActive(!active)}
                ref={menuIconRef}
            >
                <MenuIcon width="16" height="16" />
                <ComplianceMenu
                    withdrawId={withdraw.depositId}
                    active={active}
                    setActive={setActive}
                    position={`${menuPosition}-4`}
                />
            </div>
        </div>
    )
}

export default WithdrawDisplay
