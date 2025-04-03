import { DeviceAccountInfo } from "@block-wallet/background/controllers/AccountTrackerController"
import classnames from "classnames"
import { BigNumber } from "@ethersproject/bignumber"
import { formatUnits } from "@ethersproject/units"
import { useState, useMemo } from "react"
import { getAccountBalance } from "../../context/commActions"
import { useTokensList } from "../../context/hooks/useTokensList"
import { Classes } from "../../styles"
import { formatHash } from "../../util/formatAccount"
import { formatRounded } from "../../util/formatRounded"
import { getAccountColor } from "../../util/getAccountColor"
import { ViewOnExplorerButton } from "../button/ViewOnExplorerButtons"
import AccountIcon from "../icons/AccountIcon"
import EyeRevealIcon from "../icons/EyeRevealIcon"
import Spinner from "../spinner/Spinner"
import Checkbox from "../input/Checkbox"

interface HardwareWalletAccountProps {
    account: DeviceAccountInfo
    accountsBalances: { [address: string]: BigNumber }
    selected: boolean
    disabled: boolean
    onChange: () => void
    onBalanceFetched: (address: string, balance: BigNumber) => void
}

export const HardwareWalletAccount = ({
    account,
    selected,
    disabled,
    onChange,
    accountsBalances,
    onBalanceFetched,
}: HardwareWalletAccountProps) => {
    const { nativeToken } = useTokensList()
    const [isLoading, setIsLoading] = useState(false)
    const [balance, setBalance] = useState<string>(
        account.address in accountsBalances
            ? formatRounded(
                formatUnits(
                    accountsBalances[account.address] || "0",
                    nativeToken.token.decimals
                ),
                5
            ) + ` ${nativeToken.token.symbol}`
            : "*******"
    )

    const formatAddress = (address: string): string => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`
    }

    const formatBalance = (balance: BigNumber | null): string => {
        if (!balance) return '*******'
        return formatUnits(balance, 18)
    }

    const formattedBalance = useMemo(() => {
        const balance = accountsBalances[account.address]
        return formatBalance(balance || null)
    }, [account.address, accountsBalances])

    const fetchBalance = async () => {
        try {
            setIsLoading(true)
            const balanceFetched = await getAccountBalance(account.address)
            onBalanceFetched(account.address, balanceFetched)
            setBalance(
                formatRounded(
                    formatUnits(
                        balanceFetched || "0",
                        nativeToken.token.decimals
                    ),
                    5
                ) + ` ${nativeToken.token.symbol}`
            )
        } catch (error) {
            setBalance("<Error fetching>")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div
            className={classnames(
                "flex items-center justify-between py-4 px-6 transition-colors duration-200 hover:bg-gray-50",
                {
                    "cursor-pointer": !disabled,
                    "cursor-not-allowed opacity-60": disabled,
                    "border-b border-gray-200": true
                }
            )}
            onClick={() => !disabled && onChange()}
        >
            <div className="flex items-center space-x-4">
                <Checkbox
                    checked={selected}
                    disabled={disabled}
                    onChange={() => onChange()}
                    label={<span className="sr-only">{`Select ${account.name}`}</span>}
                />
                <div className="flex flex-col">
                    <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{account.name}</span>
                        {disabled && (
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                                Imported
                            </span>
                        )}
                    </div>
                    <span className="text-sm text-gray-600">{formatAddress(account.address)}</span>
                </div>
            </div>
            <div className="flex items-center">
                <div className="text-right">
                    <span className="text-sm font-medium text-gray-900">Balance: {formattedBalance}</span>
                </div>
                <div className="ml-5 flex space-x-2">
                    <button
                        type="button"
                        className="inline-flex items-center rounded-full p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onClick={(e) => {
                            e.stopPropagation()
                            fetchBalance()
                        }}
                    >
                        {isLoading ? (
                            <Spinner color="black" size="16" />
                        ) : (
                            <EyeRevealIcon />
                        )}
                    </button>
                    <ViewOnExplorerButton
                        mode="icon"
                        hash={account.address}
                        type="address"
                    />
                </div>
            </div>
        </div>
    )
}
