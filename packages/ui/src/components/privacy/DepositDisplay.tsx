import { useState, useRef, useMemo } from "react"

// Components
import ComplianceMenu from "./ComplianceMenu"
import MenuIcon from "../icons/MenuIcon"

// Context
import { useTokensList } from "../../context/hooks/useTokensList"

// Utils
import { getDisplayTime } from "../../util/getDisplayTime"
import { useSelectedNetwork } from "../../context/hooks/useSelectedNetwork"
import { useOnClickOutside } from "../../util/useOnClickOutside"
import { CurrencyAmountPair } from "@block-wallet/background/controllers/blank-deposit/types"
import Tag from "../ui/Tag"

// Types
type DepositDisplayProps = {
    status: "PENDING" | "WITHDRAWN"
    id: string
    currencyPair: CurrencyAmountPair
    time: number
}
type CurrentAsset = {
    symbol: string
    logo: string
}

const DepositDisplay = ({
    currencyPair,
    time,
    id,
    status,
}: DepositDisplayProps) => {
    const { currentNetworkTokens } = useTokensList()
    const { nativeCurrency, defaultNetworkLogo } = useSelectedNetwork()

    const [active, setActive] = useState<boolean>(false)
    const menuIconRef = useRef(null)
    useOnClickOutside(menuIconRef, () => setActive(false))

    const currentAsset: CurrentAsset | undefined = useMemo(() => {
        const tokenWithBalance = currentNetworkTokens.find(({ token }) => {
            return (
                currencyPair.currency.toLowerCase() ===
                token.symbol.toLowerCase()
            )
        })
        return tokenWithBalance
            ? ({
                  symbol: tokenWithBalance.token!.symbol,
                  logo: tokenWithBalance.token!.logo,
              } as CurrentAsset)
            : undefined
    }, [currencyPair?.currency, currentNetworkTokens])

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
                        {currencyPair.amount}{" "}
                        {currencyPair.currency.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-600">
                        {getDisplayTime(new Date(time))}
                    </span>
                </div>
            </div>
            {status === "WITHDRAWN" && (
                <div>
                    <Tag profile="dark" size="md">
                        Withdrawn
                    </Tag>
                </div>
            )}

            {/* Menu */}
            <div
                className="relative p-2 transition duration-300 rounded-full hover:bg-primary-100 hover:text-primary-300 cursor-pointer"
                onClick={() => setActive(!active)}
                ref={menuIconRef}
            >
                <div className="-z-10">
                    <MenuIcon width="16" height="16" />
                </div>
                <div className="absolute right-0 mt-2 z-50">
                    <ComplianceMenu
                        withdrawId={id}
                        active={active}
                        setActive={setActive}
                        options={
                            status === "PENDING" ? ["NOTE"] : ["NOTE", "REPORT"]
                        }
                    />
                </div>
            </div>
        </div>
    )
}

export default DepositDisplay
